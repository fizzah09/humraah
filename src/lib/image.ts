'use client';

export interface OcrWord { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }
export interface OcrResult { text: string; words: OcrWord[] }

/** Resize so the longest side is at most `max` px (PRD: 1280px). Returns a JPEG data URL. */
export async function resizeImage(file: Blob, max = 1280): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.88);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

/** Pixelate rectangles (in image coordinates) on a data URL. */
export async function blurRegions(dataUrl: string, rects: { x: number; y: number; w: number; h: number }[]): Promise<string> {
  const img = await loadImage(dataUrl);
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  for (const r of rects) {
    const x = Math.max(0, Math.round(r.x));
    const y = Math.max(0, Math.round(r.y));
    const w = Math.max(1, Math.round(r.w));
    const h = Math.max(1, Math.round(r.h));
    const block = Math.max(6, Math.round(Math.min(w, h) / 4));
    const small = document.createElement('canvas');
    small.width = Math.max(1, Math.round(w / block));
    small.height = Math.max(1, Math.round(h / block));
    const sctx = small.getContext('2d')!;
    sctx.drawImage(c, x, y, w, h, 0, 0, small.width, small.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(small, 0, 0, small.width, small.height, x, y, w, h);
    ctx.imageSmoothingEnabled = true;
  }
  return c.toDataURL('image/jpeg', 0.88);
}

/** Client-side OCR (Tesseract.js, English), fully self-hosted from /public. Images never leave the device for OCR. */
export async function runOcr(dataUrl: string): Promise<OcrResult> {
  const Tesseract = (await import('tesseract.js')).default;
  const worker = await Tesseract.createWorker('eng', 1, {
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract',
    langPath: '/tessdata', // copied from @tesseract.js-data/eng by `npm install` (postinstall)
  });
  const { data } = await worker.recognize(dataUrl).finally(() => worker.terminate());
  const words: OcrWord[] = (data.words ?? []).map((w: { text: string; bbox: OcrWord['bbox'] }) => ({ text: w.text, bbox: w.bbox }));
  return { text: data.text ?? '', words };
}

/** Words that look like account / card / CNIC / phone numbers (6+ digits). */
export function sensitiveWords(words: OcrWord[]): OcrWord[] {
  return words.filter((w) => (w.text.replace(/\D/g, '').length >= 6));
}

/** Find the bounding box of a (possibly multi-word) label in OCR output. */
export function findLabel(words: OcrWord[], label: string): OcrWord['bbox'] | null {
  const target = label.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(Boolean);
  if (!target.length) return null;
  const clean = words.map((w) => w.text.toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (let i = 0; i < clean.length; i++) {
    if (clean[i] !== target[0]) continue;
    let ok = true;
    for (let j = 1; j < target.length; j++) if (clean[i + j] !== target[j]) { ok = false; break; }
    if (ok) {
      const ws = words.slice(i, i + target.length);
      return {
        x0: Math.min(...ws.map((w) => w.bbox.x0)),
        y0: Math.min(...ws.map((w) => w.bbox.y0)),
        x1: Math.max(...ws.map((w) => w.bbox.x1)),
        y1: Math.max(...ws.map((w) => w.bbox.y1)),
      };
    }
  }
  // label wrapped over two lines: union of each word's nearest occurrence
  const first = clean.findIndex((c) => c === target[0]);
  if (first >= 0 && target.length > 1) {
    const ws = [words[first]];
    for (const t of target.slice(1)) {
      const near = clean
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => c === t)
        .sort((a, b) => Math.abs(words[a.i].bbox.y0 - words[first].bbox.y0) - Math.abs(words[b.i].bbox.y0 - words[first].bbox.y0))[0];
      if (near && Math.abs(words[near.i].bbox.y0 - words[first].bbox.y0) < 3 * (words[first].bbox.y1 - words[first].bbox.y0)) ws.push(words[near.i]);
    }
    if (ws.length === target.length) {
      return {
        x0: Math.min(...ws.map((w) => w.bbox.x0)), y0: Math.min(...ws.map((w) => w.bbox.y0)),
        x1: Math.max(...ws.map((w) => w.bbox.x1)), y1: Math.max(...ws.map((w) => w.bbox.y1)),
      };
    }
  }
  // single-word partial fallback
  const idx = clean.findIndex((c) => c && c === target[target.length - 1]);
  return idx >= 0 ? words[idx].bbox : null;
}
