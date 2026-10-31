'use client';
/**
 * Firebase (Auth + Firestore). Configured only through NEXT_PUBLIC_FIREBASE_* env values
 * (these are public identifiers, not secrets; access is protected by Firestore security rules).
 * Without them the app runs in device-only demo mode.
 */
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type Auth, type User } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, initializeFirestore, persistentLocalCache, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';

import { firebaseConfig as config, firebaseEnabled } from './firebaseConfig';
export { firebaseEnabled };

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let analytics: Analytics | null = null;

function init() {
  if (!firebaseEnabled || typeof window === 'undefined') return;
  if (!app) {
    app = getApps()[0] ?? initializeApp(config);
    auth = getAuth(app);
    auth.languageCode = 'ur';
    db = initializeFirestore(app, { localCache: persistentLocalCache() });
    if (config.measurementId) {
      isSupported().then((supported) => {
        if (supported && app && !analytics) {
          analytics = getAnalytics(app);
        }
      }).catch(() => {});
    }
  }
}

export { app, auth, db, analytics };

export function watchUser(cb: (u: User | null) => void): () => void {
  init();
  if (!auth) { cb(null); return () => {}; }
  return onAuthStateChanged(auth, cb);
}

/** Google sign-in: one tap for most Android users, no password or SMS code to remember. */
export async function signInWithGoogle() {
  init();
  if (!auth) throw new Error('Firebase not configured');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth, provider);
  } catch (e: unknown) {
    const code = (e as { code?: string }).code ?? '';
    // popups are often blocked on phones: fall back to a full-page redirect
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') await signInWithRedirect(auth, provider);
    else throw e;
  }
}

export async function logOut() { init(); if (auth) await signOut(auth); }

export async function idToken(): Promise<string | null> {
  init();
  return auth?.currentUser ? auth.currentUser.getIdToken() : null;
}

export const currentUid = () => auth?.currentUser?.uid ?? null;

// ---------- Firestore: users/{uid} (code salt + verifier), users/{uid}/vault/{key} (ciphertext only) ----------
export interface RemoteAuth { salt: string; iterations: number; verifier: string }

export async function getRemoteAuth(uid: string): Promise<RemoteAuth | null> {
  init(); if (!db) return null;
  const s = await getDoc(doc(db, 'users', uid));
  const d = s.data();
  return d?.salt && d?.verifier ? { salt: d.salt, iterations: d.iterations, verifier: d.verifier } : null;
}

export async function setRemoteAuth(uid: string, a: RemoteAuth) {
  init(); if (!db) return;
  await setDoc(doc(db, 'users', uid), { ...a, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getVault(uid: string): Promise<Record<string, string>> {
  init(); if (!db) return {};
  const out: Record<string, string> = {};
  (await getDocs(collection(db, 'users', uid, 'vault'))).forEach((d) => { const ct = d.data().ct; if (typeof ct === 'string') out[d.id] = ct; });
  return out;
}

export async function putVault(uid: string, key: string, ct: string) {
  init(); if (!db) return;
  await setDoc(doc(db, 'users', uid, 'vault', key), { ct, updatedAt: serverTimestamp() });
}

export async function wipeRemote(uid: string) {
  init(); if (!db) return;
  const snap = await getDocs(collection(db, 'users', uid, 'vault'));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, 'users', uid));
}

/** Deletes the encrypted data in the cloud but keeps the code record (users/{uid}). */
export async function deleteVault(uid: string) {
  init(); if (!db) return;
  const snap = await getDocs(collection(db, 'users', uid, 'vault'));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}
