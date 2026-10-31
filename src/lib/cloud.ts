'use client';
/**
 * Lazy door to Firebase: the ~200 KB SDK is downloaded only when Firebase is configured
 * and actually used, so phones in demo mode (or before login) stay light.
 */
import type { User } from 'firebase/auth';
import type { RemoteAuth } from './firebase';
export { firebaseEnabled } from './firebaseConfig';
export type { RemoteAuth };

const sdk = () => import('./firebase');

export function watchUser(cb: (u: User | null) => void): () => void {
  let unsub: (() => void) | null = null;
  let cancelled = false;
  sdk().then((m) => { if (!cancelled) unsub = m.watchUser(cb); }).catch(() => cb(null));
  return () => { cancelled = true; unsub?.(); };
}
export const signInWithGoogle = async () => (await sdk()).signInWithGoogle();
export const logOut = async () => (await sdk()).logOut();
export const idToken = async () => (await sdk()).idToken();
export const currentUid = async () => (await sdk()).currentUid();
export const getRemoteAuth = async (uid: string) => (await sdk()).getRemoteAuth(uid);
export const setRemoteAuth = async (uid: string, a: RemoteAuth) => (await sdk()).setRemoteAuth(uid, a);
export const getVault = async (uid: string) => (await sdk()).getVault(uid);
export const putVault = async (uid: string, key: string, ct: string) => (await sdk()).putVault(uid, key, ct);
export const wipeRemote = async (uid: string) => (await sdk()).wipeRemote(uid);
export const deleteVault = async (uid: string) => (await sdk()).deleteVault(uid);
