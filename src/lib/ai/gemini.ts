/**
 * Google Gemini client (server-side only: the API key never reaches the browser).
 * Uses the standard Gemini generateContent REST API (v1beta).
 * Models are configurable via env so the team can switch when Google renames them.
 */
import 'server-only';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
export const geminiConfigured = () => !!process.env.GEMINI_API_KEY;
const TEXT_MODEL = () => process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const TTS_MODEL = () => process.env.GEMINI_TTS_MODEL || 'gemini-1.5-flash';
const TTS_VOICE = () => process.env.GEMINI_TTS_VOICE || 'Kore';

type Part = { type: 'text'; text: string } | { type: 'image'; data: string; mime_type: string };

async function callGenerateContent(model: string, body: unknown, timeoutMs = 20000): Promise<any> {
  const key = process.env.GEMINI_API_KEY!;
  const url = `${API_BASE}/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
  }
  return res.json();
}

/** Extract the first text from a standard generateContent response. */
function extractText(data: any): string {
  try {
    return data?.candidates?.[0]?.content?.parts
      ?.filter((p: any) => typeof p?.text === 'string')
      ?.map((p: any) => p.text)
      ?.join('') ?? '';
  } catch {
    return '';
  }
}

/** Convert our internal Part[] to Gemini API parts format. */
function toParts(parts: Part[]): any[] {
  return parts.map((p) => {
    if (p.type === 'text') return { text: p.text };
    return { inlineData: { mimeType: p.mime_type, data: p.data } };
  });
}

/** Ask Gemini for JSON matching `schema`. Returns the parsed object or null. */
export async function geminiJson(opts: {
  system: string;
  parts: Part[];
  schema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<unknown | null> {
  const body = {
    system_instruction: { parts: [{ text: opts.system }] },
    contents: [{ role: 'user', parts: toParts(opts.parts) }],
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: opts.maxTokens ?? 1024,
      temperature: 0.2,
    },
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const data = await callGenerateContent(TEXT_MODEL(), body);
      const text = extractText(data);
      const json = text.match(/\{[\s\S]*\}/)?.[0];
      if (!json) continue;
      return JSON.parse(json);
    } catch (e) {
      if (attempt === 1) throw e;
    }
  }
  return null;
}

/** Urdu text-to-speech — falls back to null (browser TTS used instead). */
export async function geminiSpeech(_text: string): Promise<string | null> {
  // Standard Gemini REST API does not support TTS; browser SpeechSynthesis is used instead.
  return null;
}
