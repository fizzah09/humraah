'use client';
import { useEffect, useState } from 'react';

/**
 * Device storage.
 * - Preference keys (language, text size, consent seen, login metadata) are stored in plain text.
 * - Everything else (ledger, bills, statement, history log, profile…) is encrypted with AES-GCM
 *   using a key derived from the user's picture code (PBKDF2-SHA256). The key lives only in memory
 *   and is wiped on lock / auto-lock; without the code the data on the device is unreadable.
 */
const PREFIX = 'bank-saathi:';
const ENC = 'enc:';
const PLAIN_KEYS = new Set(['lang', 'bigText', 'imageConsent', 'auth']);

let key: CryptoKey | null = null;
/** Signed-in Firebase user: encrypted values are mirrored to Firestore users/{uid}/vault/{key}. */
let cloud: { uid: string; put: (uid: string, k: string, ct: string) => Promise<void> } | null = null;
let syncError: string | null = null;
export const lastSyncError = () => syncError;
const cache = new Map<string, unknown>();
const listeners = new Set<() => void>();

const raw = {
  get(k: string) { try { return localStorage.getItem(PREFIX + k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(PREFIX + k, v); } catch { /* quota / private mode */ } },
  del(k: string) { try { localStorage.removeItem(PREFIX + k); } catch { /* ignore */ } },
  keys(): string[] {
    const out: string[] = [];
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; if (k.startsWith(PREFIX)) out.push(k.slice(PREFIX.length)); } } catch { /* ignore */ }
    return out;
  },
};

// ---------- crypto helpers ----------
const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b instanceof Uint8Array ? b : new Uint8Array(b))));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const PBKDF2_ITERATIONS = 600_000; // OWASP 2023 recommendation for PBKDF2-SHA256

export async function deriveKey(secret: string, saltB64: string, iterations = PBKDF2_ITERATIONS): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(saltB64), iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptWith(k: CryptoKey, value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(JSON.stringify(value)));
  return `${b64(iv)}.${b64(ct)}`;
}

export async function decryptWith<T>(k: CryptoKey, payload: string): Promise<T> {
  const [iv, ct] = payload.split('.');
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, k, unb64(ct));
  return JSON.parse(new TextDecoder().decode(pt)) as T;
}

export const randomSalt = () => b64(crypto.getRandomValues(new Uint8Array(16)));

// ---------- session ----------
/** Called by the auth gate after a successful unlock: decrypts every stored key into memory. */
export async function openSession(
  k: CryptoKey,
  remote?: { uid: string; fetch: (uid: string) => Promise<Record<string, string>>; put: (uid: string, k: string, ct: string) => Promise<void> },
) {
  key = k;
  cache.clear();
  cloud = remote ? { uid: remote.uid, put: remote.put } : null;
  if (remote) {
    try {
      const vault = await remote.fetch(remote.uid);
      // cloud copy wins (it is the latest from any device); push keys that exist only on this phone
      for (const [name, ct] of Object.entries(vault)) if (!PLAIN_KEYS.has(name)) raw.set(name, ENC + ct);
      for (const name of raw.keys()) {
        const v = raw.get(name);
        if (!PLAIN_KEYS.has(name) && v?.startsWith(ENC) && !(name in vault)) remote.put(remote.uid, name, v.slice(ENC.length)).catch(() => {});
      }
      syncError = null;
    } catch {
      syncError = 'Internet nahi, is liye cloud se data nahi aaya. Phone wala data dikh raha hai.';
    }
  }
  for (const name of raw.keys()) {
    if (PLAIN_KEYS.has(name)) continue;
    const v = raw.get(name);
    if (!v) continue;
    if (v.startsWith(ENC)) {
      try { cache.set(name, await decryptWith(k, v.slice(ENC.length))); } catch { /* corrupted entry: skip */ }
    } else {
      // migrate old plain-text data from earlier versions into encrypted form
      try { const parsed = JSON.parse(v); cache.set(name, parsed); persist(name, parsed); } catch { /* ignore */ }
    }
  }
}

export function closeSession() {
  key = null;
  cloud = null;
  cache.clear();
}

export const isOpen = () => key !== null;

function persist(name: string, value: unknown) {
  const k = key;
  if (!k) return;
  encryptWith(k, value).then((p) => {
    if (key !== k) return;
    raw.set(name, ENC + p);
    const c = cloud;
    if (c) c.put(c.uid, name, p).then(() => { syncError = null; }).catch(() => { syncError = 'Cloud par save nahi hua (internet?). Phone par mehfooz hai.'; });
  }).catch(() => {});
}

export function load<T>(name: string, fallback: T): T {
  if (PLAIN_KEYS.has(name)) {
    try { const v = raw.get(name); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
  }
  return cache.has(name) ? (cache.get(name) as T) : fallback;
}

export function save<T>(name: string, value: T) {
  if (PLAIN_KEYS.has(name)) { raw.set(name, JSON.stringify(value)); return; }
  if (!key) return; // locked: never write sensitive data unencrypted
  cache.set(name, value);
  persist(name, value);
  listeners.forEach((l) => l());
}

/** Subscribe to writes (used by the history log and reminder banner to refresh). */
export function onChange(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

/** React state persisted on this device (encrypted unless it is a preference key). */
export function useStored<T>(name: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setValue(load(name, fallback));
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);
  useEffect(() => {
    if (ready) save(name, value);
  }, [name, value, ready]);
  return [value, setValue, ready] as const;
}

export function exportAll(): string {
  const out: Record<string, unknown> = {};
  cache.forEach((v, k) => { out[k] = v; });
  return JSON.stringify(out, null, 2);
}

/** Removes this device's copy only (used when a different account signs in on the same phone). */
export function clearLocal() {
  raw.keys().filter((k) => k !== 'lang' && k !== 'bigText').forEach((k) => raw.del(k));
  cache.clear();
}

/** Deletes every Humraah key on this device, including the login. */
export function deleteAll() {
  raw.keys().forEach((k) => raw.del(k));
  cache.clear();
}

/** Deletes data but keeps the login and preferences. */
export function deleteData() {
  raw.keys().filter((k) => !PLAIN_KEYS.has(k)).forEach((k) => raw.del(k));
  cache.clear();
  listeners.forEach((l) => l());
}
