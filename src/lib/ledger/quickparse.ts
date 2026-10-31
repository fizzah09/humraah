import type { LedgerSource, Purpose } from '../types';

const WORDS: Record<string, number> = {
  ek: 1, aik: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, che: 6, saat: 7, aath: 8, ath: 8, nau: 9,
  das: 10, dus: 10, gyarah: 11, barah: 12, pandrah: 15, bees: 20, pachees: 25, tees: 30, chalees: 40, pachaas: 50, pachas: 50,
  saath: 60, sattar: 70, assi: 80, nabbe: 90, dedh: 1.5, dhai: 2.5, sarhe: 0,
};
const MULT: Record<string, number> = { sau: 100, so: 100, hazaar: 1000, hazar: 1000, thousand: 1000, k: 1000, lakh: 100000, lac: 100000 };

/** "paanch hazaar" -> 5000, "5k" -> 5000, "dedh lakh" -> 150000, "Rs 2,500" -> 2500 */
export function parseAmount(text: string): number | null {
  const t = text.toLowerCase().replace(/,/g, '');
  const digit = t.match(/(\d+(\.\d+)?)\s*(k|hazaar|hazar|thousand|lakh|lac|sau)?\b/);
  if (digit) return Math.round(parseFloat(digit[1]) * (digit[3] ? MULT[digit[3]] : 1));
  let total = 0;
  let cur = 0;
  let found = false;
  let sarhe = false;
  for (const w of t.split(/\s+/)) {
    if (w === 'sarhe' || w === 'sadhe') { sarhe = true; found = true; continue; }
    if (w in WORDS) { cur += WORDS[w] + (sarhe ? 0.5 : 0); sarhe = false; found = true; }
    else if (w in MULT) { total += (cur || 1) * MULT[w]; cur = 0; found = true; }
  }
  total += cur;
  return found && total > 0 ? Math.round(total) : null;
}

const PURPOSE_WORDS: [RegExp, Purpose][] = [
  [/rashan|grocer|sabzi|doodh|kiryana|راشن/i, 'groceries'],
  [/school|fee|tuition|college|اسکول/i, 'school'],
  [/rent|kiraya|کرایہ/i, 'rent'],
  [/ammi|abbu|bhai|behen|family|ghar\s*walon|amma/i, 'family'],
  [/doctor|dawai|medicine|hospital|medical|دوائی/i, 'medical'],
  [/bill|bijli|gas|paani|بل/i, 'bills'],
  [/gift|tohfa|shaadi|salami|eidi/i, 'gift'],
];

export function guessPurpose(text: string): Purpose | null {
  return PURPOSE_WORDS.find(([re]) => re.test(text))?.[1] ?? null;
}

/** Parse a bank debit SMS for amount + type (P1 extra). */
export function parseDebitSms(sms: string): { amount: number | null; source: LedgerSource; date: string | null } {
  const amt = sms.match(/(?:rs\.?|pkr)\s*([\d,]+(?:\.\d{1,2})?)/i);
  const source: LedgerSource = /atm|cash\s*withdraw/i.test(sms) ? 'atm' : /transfer|ibft|raast|sent/i.test(sms) ? 'transfer' : 'other';
  const d = sms.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  const date = d ? `${d[3].length === 2 ? '20' + d[3] : d[3]}-${d[2].padStart(2, '0')}-${d[1].padStart(2, '0')}` : null;
  return { amount: amt ? parseFloat(amt[1].replace(/,/g, '')) : null, source, date };
}
