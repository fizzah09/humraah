/**
 * Grocery (sauda) list parser + calculator. Deterministic: AI/OCR only reads the parchi,
 * this code does the maths so every step can be shown to the user.
 */
export type Unit = 'kg' | 'g' | 'litre' | 'ml' | 'dozen' | 'piece' | 'packet';

export interface SaudaItem {
  id: string;
  raw: string; // what was written / heard
  name: string; // normalised item name
  qty: number | null; // in `unit`
  unit: Unit | null;
  price: number | null; // total price written on the line (if any)
  rate: number | null; // price per 1 rate-unit (kg / litre / dozen / piece / packet)
  problem: 'unreadable' | 'no_qty' | 'no_price' | null;
}

const NUM_WORDS: Record<string, number> = {
  aadha: 0.5, adha: 0.5, half: 0.5, pao: 0.25, paao: 0.25, sawa: 1.25, dedh: 1.5, dhai: 2.5,
  ek: 1, aik: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, che: 6, saat: 7, aath: 8, nau: 9, das: 10, barah: 12, bees: 20,
};

const UNIT_RE: [RegExp, Unit, number][] = [
  // pattern, unit, multiplier into that unit
  [/^(kg|kilo|kgs|killo|کلو)$/i, 'kg', 1],
  [/^(g|gm|gram|grams|grm)$/i, 'g', 1],
  [/^(pao|paao|pav)$/i, 'kg', 0.25],
  [/^(l|ltr|litre|liter|litres|liters|لیٹر)$/i, 'litre', 1],
  [/^(ml)$/i, 'ml', 1],
  [/^(darjan|dozen|درجن)$/i, 'dozen', 1],
  [/^(adad|piece|pieces|pc|pcs|nag|عدد)$/i, 'piece', 1],
  [/^(packet|pkt|packets|dabba|daba|pack)$/i, 'packet', 1],
];

/** Roman Urdu / Urdu item names -> one canonical name, so remembered rates match. */
const ALIASES: [RegExp, string][] = [
  [/^(cheeni|chini|sugar|چینی)$/i, 'cheeni'], [/^(aata|atta|flour|آٹا)$/i, 'aata'], [/^(chawal|chaawal|rice|چاول)$/i, 'chawal'],
  [/^(doodh|dudh|milk|دودھ)$/i, 'doodh'], [/^(anday|ande|anda|eggs?|انڈے)$/i, 'anday'], [/^(ghee|گھی)$/i, 'ghee'],
  [/^(tel|oil|cooking oil|تیل)$/i, 'tel'], [/^(daal|dal|دال)$/i, 'daal'], [/^(chai|patti|chai patti|tea|چائے)$/i, 'chai patti'],
  [/^(namak|salt|نمک)$/i, 'namak'], [/^(pyaz|piyaz|onion|onions|پیاز)$/i, 'pyaz'], [/^(aloo|alu|potato|potatoes|آلو)$/i, 'aloo'],
  [/^(tamatar|tomato|tomatoes|ٹماٹر)$/i, 'tamatar'], [/^(dahi|yogurt|دہی)$/i, 'dahi'], [/^(double roti|bread|ڈبل روٹی)$/i, 'double roti'],
];

export function canonical(name: string): string {
  const n = name.trim().toLowerCase().replace(/\s+/g, ' ');
  return ALIASES.find(([re]) => re.test(n))?.[1] ?? n;
}

/** Unit in which a rate is quoted (per kg / per litre / per dozen / per piece / per packet). */
export function rateUnit(u: Unit | null): Unit {
  if (u === 'g') return 'kg';
  if (u === 'ml') return 'litre';
  return u ?? 'piece';
}

/** Quantity expressed in rate units (500 g -> 0.5 kg). */
export function qtyInRateUnit(qty: number, u: Unit | null): number {
  if (u === 'g' || u === 'ml') return qty / 1000;
  return qty;
}

let seq = 0;
const nid = () => `s${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Parse one line like "2 kg cheeni 300", "doodh 1 litre @ 220", "aadha kilo dahi", "anday 1 darjan". */
export function parseLine(line: string): SaudaItem {
  const raw = line.trim();
  const base: SaudaItem = { id: nid(), raw, name: '', qty: null, unit: null, price: null, rate: null, problem: null };
  // OCR garbage check: needs at least 2 letters
  const letters = (raw.match(/[a-z؀-ۿ]/gi) ?? []).length;
  if (letters < 2) return { ...base, problem: 'unreadable' };

  let text = raw.toLowerCase().replace(/rs\.?|pkr|روپے|rupay|rupees?/g, ' ').replace(/[=:,]/g, ' ');
  // "@ 220" or "220/kg" -> rate
  let rate: number | null = null;
  const at = text.match(/@\s*(\d+(?:\.\d+)?)/) ?? text.match(/(\d+(?:\.\d+)?)\s*\/\s*(kg|kilo|litre|ltr|dozen|darjan|piece|adad)/);
  if (at) { rate = parseFloat(at[1]); text = text.replace(at[0], ' '); }

  const tokens = text.split(/\s+/).filter(Boolean);
  let qty: number | null = null;
  let unit: Unit | null = null;
  let price: number | null = null;
  const nameParts: string[] = [];
  const numbers: { v: number; i: number }[] = [];

  tokens.forEach((tok, i) => {
    const m = tok.match(/^(\d+(?:\.\d+)?)([a-z]+)?$/); // "2kg", "500g", "5"
    if (m) {
      const u = m[2] ? UNIT_RE.find(([re]) => re.test(m[2])) : undefined;
      if (u) { qty = parseFloat(m[1]) * u[2]; unit = u[1]; } else numbers.push({ v: parseFloat(m[1]), i });
      return;
    }
    const u = UNIT_RE.find(([re]) => re.test(tok));
    if (u) {
      if (u[1] === 'kg' && u[2] === 0.25 && qty === null) { qty = 0.25; unit = 'kg'; return; } // "pao" alone = 250 g
      unit = u[1];
      if (u[2] !== 1 && qty !== null) qty = qty * u[2];
      return;
    }
    if (tok in NUM_WORDS && nameParts.length === 0 || (tok in NUM_WORDS && (tokens[i + 1] && UNIT_RE.some(([re]) => re.test(tokens[i + 1]))))) {
      qty = (qty ?? 0) + NUM_WORDS[tok];
      return;
    }
    nameParts.push(tok);
  });

  // numbers without a unit: the one right before a unit-less name is qty, a large/last one is price
  const unitless = numbers.map((n) => n.v);
  if (qty === null && unitless.length >= 2) { qty = unitless[0]; price = unitless[unitless.length - 1]; }
  else if (qty === null && unitless.length === 1) {
    // "cheeni 300" -> a number alone after the name is more likely a price if large
    if (unitless[0] >= 50 && nameParts.length) price = unitless[0]; else qty = unitless[0];
  } else if (qty !== null && unitless.length) price = unitless[unitless.length - 1];

  if (qty !== null && unit === null) unit = 'piece';
  const name = canonical(nameParts.join(' ').replace(/[^a-z؀-ۿ ]/gi, '').trim());
  if (!name) return { ...base, problem: 'unreadable' };
  const item: SaudaItem = { ...base, name, qty, unit, price, rate };
  return { ...item, problem: problemOf(item) };
}

export function problemOf(it: SaudaItem): SaudaItem['problem'] {
  if (!it.name) return 'unreadable';
  if (it.price !== null) return null; // total price written: enough to add up
  if (it.qty === null) return 'no_qty';
  if (it.rate === null) return 'no_price';
  return null;
}

export function parseList(text: string): SaudaItem[] {
  return text
    .split(/\r?\n|,|،|;/)
    .map((l) => l.replace(/^\s*(\d+[.)]|[-*•])\s*/, '').trim()) // list bullets "1." "-" "•"
    .filter((l) => l.length > 0)
    .map(parseLine);
}

/** Fill missing rates from the user's remembered price list. */
export function applyRates(items: SaudaItem[], rates: Record<string, number>): SaudaItem[] {
  return items.map((it) => {
    if (it.rate !== null || it.price !== null || !it.name || !(it.name in rates)) return it;
    const next = { ...it, rate: rates[it.name] };
    return { ...next, problem: problemOf(next) };
  });
}

export interface Line { item: SaudaItem; amount: number; working: string }

const UNIT_LABEL: Record<Unit, string> = { kg: 'kg', g: 'gram', litre: 'litre', ml: 'ml', dozen: 'darjan', piece: 'adad', packet: 'packet' };
export const unitLabel = (u: Unit | null) => (u ? UNIT_LABEL[u] : '');

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Line amount with the working written out, e.g. "500 gram = 0.5 kg × Rs 160 = Rs 80". */
export function lineAmount(it: SaudaItem): Line | null {
  if (it.problem) return null;
  if (it.price !== null) return { item: it, amount: it.price, working: `Parchi par likha: Rs ${it.price}` };
  const q = qtyInRateUnit(it.qty!, it.unit);
  const amount = r2(q * it.rate!);
  const conv = it.unit === 'g' || it.unit === 'ml' ? `${it.qty} ${unitLabel(it.unit)} = ${q} ${unitLabel(rateUnit(it.unit))}, ` : '';
  return { item: it, amount, working: `${conv}${q} ${unitLabel(rateUnit(it.unit))} × Rs ${it.rate} = Rs ${amount}` };
}

export function total(items: SaudaItem[]) {
  const lines = items.map(lineAmount).filter((l): l is Line => l !== null);
  const sum = r2(lines.reduce((s, l) => s + l.amount, 0));
  return { lines, sum, pending: items.filter((i) => i.problem) };
}

/** Change to get back, with a note-by-note breakdown to practise counting. */
export function changeBack(paid: number, sum: number) {
  const change = r2(paid - sum);
  const notes = [5000, 1000, 500, 100, 50, 20, 10, 5, 2, 1];
  const out: { note: number; count: number }[] = [];
  let left = Math.max(0, Math.floor(change));
  for (const n of notes) { const c = Math.floor(left / n); if (c) { out.push({ note: n, count: c }); left -= c * n; } }
  return { change, notes: out };
}
