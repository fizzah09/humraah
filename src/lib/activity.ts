'use client';
import { load, save } from './storage';
import { maskDigits, uid } from './format';

/**
 * Transparency log ("Meri history"): what the user said, what Saathi replied, and what
 * information was shared, in plain words. Images are NEVER stored: only metadata
 * (size, time, feature, blur used, sent to AI or not, when it was deleted).
 * All entries are encrypted on the device together with the rest of the data.
 */
export type ActivityKind = 'said' | 'reply' | 'image' | 'shared' | 'action' | 'security';

export interface ImageMeta {
  width: number;
  height: number;
  kb: number;
  type: string;
  blurBoxes: number;
  ocrRan: boolean;
  sentToAI: boolean;
  deletedAt?: string;
}

export interface Activity {
  id: string;
  at: string; // ISO time
  feature: string; // e.g. "Saathi", "Fraud check"
  kind: ActivityKind;
  text: string; // plain-language sentence, sensitive numbers masked
  image?: ImageMeta;
}

const KEY = 'activity';
const MAX = 1000; // keeps the encrypted log well under the 1 MB Firestore document limit

export function logActivity(feature: string, kind: ActivityKind, text: string, image?: ImageMeta): string {
  const entry: Activity = { id: uid(), at: new Date().toISOString(), feature, kind, text: maskDigits(text).slice(0, 600), image };
  const list = load<Activity[]>(KEY, []);
  save(KEY, [entry, ...list].slice(0, MAX));
  return entry.id;
}

export function updateImageMeta(id: string, patch: Partial<ImageMeta>) {
  const list = load<Activity[]>(KEY, []);
  save(KEY, list.map((a) => (a.id === id && a.image ? { ...a, image: { ...a.image, ...patch } } : a)));
}

/** Marks an image as deleted (keeps the metadata row). */
export function markImageDeleted(id: string) {
  const list = load<Activity[]>(KEY, []);
  save(KEY, list.map((a) => (a.id === id && a.image ? { ...a, image: { ...a.image, deletedAt: new Date().toISOString() } } : a)));
}

export function imageMetaFromDataUrl(dataUrl: string, w: number, h: number, blurBoxes: number, ocrRan: boolean): ImageMeta {
  const type = dataUrl.slice(5, dataUrl.indexOf(';'));
  const kb = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75 / 1024);
  return { width: w, height: h, kb, type, blurBoxes, ocrRan, sentToAI: false };
}
