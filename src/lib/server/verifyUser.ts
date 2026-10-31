/**
 * Verifies a Firebase ID token on the server (no service account needed):
 * signature against Google's public keys, issuer, audience = project id, expiry.
 * Used so only signed-in users can spend the team's Gemini quota.
 */
import 'server-only';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));

export const authRequired = () => !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

export async function verifyUser(req: Request): Promise<string | null> {
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!project) return 'demo'; // Firebase not configured: demo mode
  const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return process.env.NODE_ENV !== 'production' ? 'demo' : null;
  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: `https://securetoken.google.com/${project}`, audience: project });
    return typeof payload.sub === 'string' && payload.sub ? payload.sub : null;
  } catch {
    return process.env.NODE_ENV !== 'production' ? 'demo' : null;
  }
}
