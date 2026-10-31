import { NextResponse } from 'next/server';
import { z } from 'zod';
import { geminiConfigured, geminiSpeech } from '@/lib/ai/gemini';
import { guard, readJson } from '@/lib/server/guard';

export const runtime = 'nodejs';

const Body = z.object({ text: z.string().min(1).max(600) });

/** Urdu speech for Saathi's replies (Gemini TTS). 204 = not configured; the browser then uses its own voice. */
export async function POST(req: Request) {
  const g = await guard(req, { maxBytes: 10_000, perMinute: 40 });
  if ('error' in g) return g.error;
  if (!geminiConfigured()) return new Response(null, { status: 204 });
  let body: z.infer<typeof Body>;
  try { body = Body.parse(await readJson(req, 10_000)); } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }
  try {
    const b64 = await geminiSpeech(body.text);
    if (!b64) return new Response(null, { status: 204 });
    return new Response(Buffer.from(b64, 'base64'), { headers: { 'content-type': 'audio/wav', 'cache-control': 'no-store' } });
  } catch {
    return new Response(null, { status: 204 });
  }
}
