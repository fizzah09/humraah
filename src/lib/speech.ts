'use client';
import { useEffect, useState } from 'react';
/* Browser Web Speech API helpers. Urdu support depends on the device; typed input is always available. */

type SR = { lang: string; interimResults: boolean; onresult: (e: { results: { 0: { transcript: string } }[] }) => void; onerror: () => void; onend: () => void; start: () => void; stop: () => void };

export function speechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

export function listen(lang: string, onText: (t: string) => void, onEnd: () => void): (() => void) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = lang;
  r.interimResults = false;
  r.onresult = (e) => onText(e.results[0][0].transcript);
  r.onerror = onEnd;
  r.onend = onEnd;
  r.start();
  return () => r.stop();
}

let current: HTMLAudioElement | null = null;

function browserSpeak(text: string, lang: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  const u = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  const v = voices.find((x) => x.lang.startsWith(lang)) ?? voices.find((x) => x.lang.startsWith('hi')) ?? voices.find((x) => x.lang.startsWith('en'));
  if (v) u.voice = v;
  u.lang = v?.lang ?? 'ur-PK';
  u.rate = 0.85;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  return true;
}

/**
 * Read a reply aloud in Urdu. Order: Gemini TTS on our server (Urdu script) -> the phone's own
 * Urdu voice -> a Hindi/English voice reading the Roman Urdu text. Never blocks the UI.
 */
export async function speakUrdu(ur: string, roman: string) {
  stopSpeaking();
  try {
    const { firebaseEnabled, idToken } = await import('./firebase');
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (firebaseEnabled) { const t = await idToken().catch(() => null); if (t) headers.authorization = `Bearer ${t}`; }
    const res = await fetch('/api/tts', { method: 'POST', headers, body: JSON.stringify({ text: ur.slice(0, 600) }) });
    if (res.status === 200) {
      const url = URL.createObjectURL(await res.blob());
      current = new Audio(url);
      current.onended = () => URL.revokeObjectURL(url);
      await current.play();
      return;
    }
  } catch { /* fall back to the phone's voice */ }
  const hasUrdu = typeof window !== 'undefined' && 'speechSynthesis' in window && speechSynthesis.getVoices().some((v) => v.lang.startsWith('ur'));
  browserSpeak(hasUrdu ? ur : roman, hasUrdu ? 'ur' : 'hi');
}

export function stopSpeaking() {
  if (current) { current.pause(); current = null; }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) speechSynthesis.cancel();
}

/** Backwards-compatible helper used by pages that only have one text. */
export function speak(text: string, lang: 'ur' | 'roman') {
  return lang === 'ur' ? speakUrdu(text, text) : speakUrdu(text, text);
}

/** Hydration-safe check: false on the server and first render, real value after mount. */
export function useSpeechSupported(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => { setOk(speechSupported()); }, []);
  return ok;
}
