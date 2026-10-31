'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Notice } from './ui';
import { blurRegions, loadImage, resizeImage, runOcr, sensitiveWords, type OcrResult } from '@/lib/image';
import { load, save } from '@/lib/storage';
import { imageMetaFromDataUrl, logActivity, markImageDeleted } from '@/lib/activity';


export interface UploadedImage {
  dataUrl: string;
  ocr: OcrResult | null;
  /** id of the metadata row in "Meri history" (the image itself is never stored) */
  logId: string;
}

interface Props {
  /** Feature name shown in the history log, e.g. "Fraud check" */
  feature: string;
  /** If true the caller shows the image for a while and marks it deleted itself; otherwise it is deleted right after use. */
  holdForDisplay?: boolean;
  onImage: (img: UploadedImage) => void | Promise<void>;
  /** Run OCR on the final image and return text + word boxes. */
  withOcr?: boolean;
  label?: string;
  hint?: string;
  compact?: boolean;
}

type Rect = { x: number; y: number; w: number; h: number };
const MAX_BYTES = 12 * 1024 * 1024;

/**
 * Image upload with the PRD privacy flow: consent notice, resize to 1280px,
 * one-tap blur tool, auto-mask of long digit strings (OCR), and no storage.
 */
export default function ImageUpload({ feature, holdForDisplay = false, onImage, withOcr = false, label = 'Upload image', hint, compact }: Props) {
  const [consent, setConsent] = useState(false);
  const [askConsent, setAskConsent] = useState(false);
  const [img, setImg] = useState<string | null>(null);
  const [rects, setRects] = useState<Rect[]>([]);
  const [drag, setDrag] = useState<Rect | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { setConsent(load('imageConsent', false)); }, []);

  const accept = useCallback(async (file: File | Blob | null | undefined) => {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Sirf tasveer (image) upload karein: JPG, PNG ya WEBP.');
    if (file.size > MAX_BYTES) return setError('Tasveer bohat bari hai (12MB se kam honi chahiye).');
    setBusy('Tasveer tayyar ho rahi hai…');
    try {
      setImg(await resizeImage(file));
      setRects([]);
    } catch {
      setError('Yeh tasveer khul nahi saki. Doosri try karein.');
    } finally {
      setBusy(null);
    }
  }, []);

  // Paste an image from clipboard while the picker is mounted
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
      if (item && consent) accept(item.getAsFile());
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [accept, consent]);

  const open = (ref: React.RefObject<HTMLInputElement>) => {
    if (!consent) { setAskConsent(true); return; }
    ref.current?.click();
  };

  const toImageCoords = (clientX: number, clientY: number) => {
    const el = imgRef.current!;
    const r = el.getBoundingClientRect();
    const sx = el.naturalWidth / r.width;
    const sy = el.naturalHeight / r.height;
    return { x: (clientX - r.left) * sx, y: (clientY - r.top) * sy };
  };

  const onDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    start.current = toImageCoords(e.clientX, e.clientY);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const p = toImageCoords(e.clientX, e.clientY);
    const s = start.current;
    setDrag({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
  };
  const onUp = () => {
    if (drag && drag.w > 8 && drag.h > 8) setRects((r) => [...r, drag]);
    setDrag(null);
    start.current = null;
  };

  const autoMask = async () => {
    if (!img) return;
    setBusy('Numbers dhoond raha hoon (OCR)…');
    try {
      const { words } = await runOcr(img);
      const found = sensitiveWords(words).map((w) => ({ x: w.bbox.x0 - 4, y: w.bbox.y0 - 4, w: w.bbox.x1 - w.bbox.x0 + 8, h: w.bbox.y1 - w.bbox.y0 + 8 }));
      setRects((r) => [...r, ...found]);
      if (!found.length) setError('Koi lamba number nahi mila. Zaroorat ho to ungli se khud blur karein.');
    } catch {
      setError('OCR nahi chal saka (internet check karein). Aap khud blur kar sakte hain.');
    } finally {
      setBusy(null);
    }
  };

  const confirm = async () => {
    if (!img) return;
    setBusy(withOcr ? 'Screen parh raha hoon…' : 'Tayyar kar raha hoon…');
    try {
      const final = rects.length ? await blurRegions(img, rects) : img;
      let ocr: OcrResult | null = null;
      if (withOcr) {
        try { ocr = await runOcr(final); } catch { ocr = null; }
      }
      const el = await loadImage(final);
      const logId = logActivity(feature, 'image', `${feature} ke liye ek tasveer di${rects.length ? ` (${rects.length} hissay blur kiye)` : ''}. Tasveer save nahi ki gayi.`, imageMetaFromDataUrl(final, el.width, el.height, rects.length, !!ocr));
      await onImage({ dataUrl: final, ocr, logId });
      if (!holdForDisplay) markImageDeleted(logId);
      setImg(null);
      setRects([]);
    } finally {
      setBusy(null);
    }
  };

  const pct = (r: Rect) => {
    const el = imgRef.current;
    if (!el || !el.naturalWidth) return {};
    return {
      left: `${(r.x / el.naturalWidth) * 100}%`,
      top: `${(r.y / el.naturalHeight) * 100}%`,
      width: `${(r.w / el.naturalWidth) * 100}%`,
      height: `${(r.h / el.naturalHeight) * 100}%`,
    };
  };

  return (
    <div className="space-y-3">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ''; }} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ''; }} />

      {askConsent && !consent && (
        <div className="rounded-xl border border-warning/40 bg-warningBg p-4 space-y-3" role="dialog" aria-label="Image consent">
          <p className="font-semibold text-ink">Tasveer bhejne se pehle</p>
          <ul className="list-disc ps-5 text-inkSecondary text-[16px] space-y-1">
            <li>Tasveer screen parhne ke liye AI service ko bheji ja sakti hai.</li>
            <li>Hum tasveer ko <b>save nahi karte</b>. Kaam ke baad delete ho jati hai.</li>
            <li>Naam, balance aur account number ko pehle <b>blur</b> kar dein.</li>
            <li>PIN, OTP ya password wali screen kabhi na bhejein.</li>
          </ul>
          <p className="font-urdu text-inkSecondary leading-[2.2]" dir="rtl">تصویر محفوظ نہیں کی جاتی۔ ذاتی معلومات پہلے دھندلی کر دیں۔</p>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => { setConsent(true); save('imageConsent', true); setAskConsent(false); fileRef.current?.click(); }}>Theek hai, aagay barhein</Button>
            <Button variant="ghost" onClick={() => setAskConsent(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {!img && (
        <div
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); if (!consent) { setAskConsent(true); return; } accept(e.dataTransfer.files?.[0]); }}
          className={`rounded-xl2 border-2 border-dashed ${over ? 'border-primary bg-primaryTint' : 'border-borderStrong bg-surfaceAlt'} ${compact ? 'p-3' : 'p-6'} text-center transition-colors`}
        >
          {!compact && (
            <svg aria-hidden width="44" height="44" viewBox="0 0 24 24" className="mx-auto mb-2 text-primary" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="9" r="1.8" /><path d="m21 15-4.5-4.5L6 21" />
            </svg>
          )}
          {!compact && <p className="font-semibold text-ink">{label}</p>}
          {!compact && <p className="text-sm text-inkMuted mb-3">{hint ?? 'Drag & drop, paste (Ctrl+V), ya neeche button dabayein'}</p>}
          <div className="flex gap-2 justify-center flex-wrap">
            <Button onClick={() => open(fileRef)} aria-label="Choose image from gallery">
              <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 16V4m0 0-4 4m4-4 4 4M4 20h16" /></svg>
              {compact ? 'Image' : 'Gallery se chunein'}
            </Button>
            <Button variant="secondary" onClick={() => open(camRef)} aria-label="Take photo with camera">
              <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
              {compact ? 'Camera' : 'Camera se photo'}
            </Button>
          </div>
        </div>
      )}

      {img && (
        <div className="space-y-3">
          <p className="text-[16px] text-inkSecondary">
            <b>Blur tool:</b> naam, balance ya account number par ungli/mouse se dabba banayein. Woh hissa dhundla ho jayega.
          </p>
          <div className="relative inline-block max-w-full select-none touch-none rounded-xl overflow-hidden border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imgRef} src={img} alt="Uploaded preview" className="block max-h-[480px] max-w-full" draggable={false} />
            <div className="absolute inset-0 cursor-crosshair" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
              {rects.map((r, i) => (
                <div key={i} className="absolute bg-ink/70 backdrop-blur-md border-2 border-white/70 rounded" style={pct(r)} />
              ))}
              {drag && <div className="absolute border-2 border-dashed border-primary bg-primaryTint/40" style={pct(drag)} />}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={confirm} disabled={!!busy}>Yeh tasveer use karein</Button>
            <Button variant="secondary" onClick={autoMask} disabled={!!busy}>Numbers auto-blur</Button>
            {rects.length > 0 && <Button variant="ghost" onClick={() => setRects((r) => r.slice(0, -1))} disabled={!!busy}>Undo blur</Button>}
            <Button variant="ghost" onClick={() => { setImg(null); setRects([]); }} disabled={!!busy}>Hatayein</Button>
          </div>
        </div>
      )}

      {busy && (
        <div className="flex items-center gap-3 text-primaryDark" role="status">
          <span className="h-5 w-5 rounded-full border-[3px] border-primaryTint border-t-primary animate-spin" />
          {busy}
        </div>
      )}
      {error && <Notice tone="warning">{error}</Notice>}
    </div>
  );
}
