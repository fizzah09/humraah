/**
 * Google Gemini client (server-side only: the API key never reaches the browser).
 * Uses the Gemini Interactions REST endpoint (checked against ai.google.dev docs, Oct 2026).
 * Models are configurable via env so the team can switch when Google renames them.
 */
import 'server-only';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
export const geminiConfigured = () => !!process.env.GEMINI_API_KEY;
const TEXT_MODEL = () => process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const TTS_MODEL = () => process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts';
const TTS_VOICE = () => process.env.GEMINI_TTS_VOICE || 'Kore';

type Part = { type: 'text'; text: string } | { type: 'image'; data: string; mime_type: string };

async function call(body: unknown, timeoutMs = 20000): Promise<any> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  return res.json();
}

/** Collect model output items of a given type from an Interactions response (robust to small shape changes). */
function outputs(data: any, type: 'text' | 'audio'): any[] {
  const steps: any[] = Array.isArray(data?.steps) ? data.steps : [];
  const model = steps.filter((s) => s?.type === 'model_output' || s?.content);
  const items = model.flatMap((s) => (Array.isArray(s.content) ? s.content : []));
  const found = items.filter((c) => c?.type === type);
  if (found.length) return found;
  if (type === 'text' && typeof data?.output_text === 'string') return [{ type: 'text', text: data.output_text }];
  return [];
}

/** Ask Gemini for JSON matching `schema`. Returns the parsed object or null. */
export async function geminiJson(opts: { system: string; parts: Part[]; schema: Record<string, unknown>; maxTokens?: number }): Promise<unknown | null> {
  const data = await call({
    model: TEXT_MODEL(),
    system_instruction: opts.system,
    input: opts.parts,
    response_format: { type: 'text', mime_type: 'application/json', schema: opts.schema },
    generation_config: { thinking_level: 'low', max_output_tokens: opts.maxTokens ?? 1024 },
  });
  const text = outputs(data, 'text').map((c) => c.text ?? '').join('');
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) return null;
  try { return JSON.parse(json); } catch { return null; }
}

/** Urdu text-to-speech. Returns base64 WAV (24 kHz mono) or null. */
export async function geminiSpeech(text: string): Promise<string | null> {
  const data = await call({
    model: TTS_MODEL(),
    input: [{ type: 'user_input', content: [{ type: 'text', text: `Read this aloud in Urdu, slowly, warmly and clearly, like explaining to an elderly parent:\n${text}` }] }],
    response_format: { type: 'audio', mime_type: 'audio/wav' },
    generation_config: { speech_config: [{ voice: TTS_VOICE() }] },
  }, 30000);
  const audio = outputs(data, 'audio');
  return audio.length ? audio[audio.length - 1].data ?? null : null;
}
