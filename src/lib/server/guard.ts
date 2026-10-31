import 'server-only';
import { NextResponse } from 'next/server';
import { verifyUser } from './verifyUser';

const buckets = new Map<string, { n: number; t: number }>();

/**
 * Shared checks for every API route: same-origin, body size, signed-in user (when Firebase is set up)
 * and a per-user / per-IP rate limit. Returns a Response to send back, or the caller id.
 */
export async function guard(req: Request, opts: { maxBytes: number; perMinute: number }): Promise<{ error: Response } | { who: string }> {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host) {
    try { if (new URL(origin).host !== host) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }; }
    catch { return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }; }
  }
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > opts.maxBytes) return { error: NextResponse.json({ error: 'Bohat bari request' }, { status: 413 }) };
  const uid = await verifyUser(req);
  if (!uid) return { error: NextResponse.json({ error: 'Pehle login karein' }, { status: 401 }) };
  const who = uid === 'demo' ? `ip:${req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'local'}` : `uid:${uid}`;
  const now = Date.now();
  if (buckets.size > 5000) buckets.forEach((v, k) => { if (now - v.t > 60_000) buckets.delete(k); }); // keep memory bounded
  const b = buckets.get(who + req.url);
  if (!b || now - b.t > 60_000) buckets.set(who + req.url, { n: 1, t: now });
  else if (++b.n > opts.perMinute) return { error: NextResponse.json({ error: 'Bohat zyada requests. Thori dair baad koshish karein.' }, { status: 429 }) };
  return { who };
}

/** Reads a JSON body but stops at maxBytes even when the client sent no Content-Length (chunked upload). */
export async function readJson(req: Request, maxBytes: number): Promise<unknown> {
  const reader = req.body?.getReader();
  if (!reader) throw new Error('empty');
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel().catch(() => {}); throw new Error('too large'); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
