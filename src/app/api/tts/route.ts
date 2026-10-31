import { NextResponse } from 'next/server';
import { z } from 'zod';
import { geminiConfigured, geminiSpeech } from '@/lib/ai/gemini';
import { guard, readJson } from '@/lib/server/guard';

export const runtime = 'nodejs';

const Body = z.object({ text: z.string().min(1).max(600) });

/** Urdu speech for Humraah replies. */
export async function POST(req: Request) {
  const g = await guard(req, { maxBytes: 10_000, perMinute: 40 });
  if ('error' in g) return g.error;
  if (!geminiConfigured()) return NextResponse.json({ error: 'TTS is not configured' }, { status: 503 });
  let body: z.infer<typeof Body>;
  try { body = Body.parse(await readJson(req, 10_000)); } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }
  try {
    const b64 = await geminiSpeech(body.text);
    return new Response(Buffer.from(b64, 'base64'), { headers: { 'content-type': 'audio/wav', 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('Urdu TTS generation failed', error);
    return NextResponse.json({ error: 'TTS generation failed' }, { status: 502 });
  }
}
