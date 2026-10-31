'use client';
import { firebaseEnabled, idToken } from './cloud';

/** POST JSON to our own API, with the Firebase ID token so the server can check who is asking. */
export async function apiPost<T = unknown>(path: string, body: unknown): Promise<{ ok: boolean; status: number; data: T }> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (firebaseEnabled) {
    const t = await idToken().catch(() => null);
    if (t) headers.authorization = `Bearer ${t}`;
  }
  const res = await fetch(path, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}
