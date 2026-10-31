import type { LedgerSource, Purpose } from '../types';

function normalizeUrduDigits(text: string): string {
  return text
    .replace(/[۰٠]/g, '0')
    .replace(/[۱١]/g, '1')
    .replace(/[۲٢]/g, '2')
    .replace(/[۳٣]/g, '3')
    .replace(/[۴٤]/g, '4')
    .replace(/[۵٥]/g, '5')
    .replace(/[۶٦]/g, '6')
    .replace(/[۷٧]/g, '7')
    .replace(/[۸٨]/g, '8')
    .replace(/[۹٩]/g, '9');
}

const WORDS: Record<string, number> = {
  // Roman Urdu
  ek: 1, aik: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, che: 6, saat: 7, aath: 8, ath: 8, nau: 9,
  das: 10, dus: 10, gyarah: 11, barah: 12, terah: 13, chaudah: 14, pandrah: 15, solah: 16, satrah: 17, atharah: 18, unnees: 19,
  bees: 20, pachees: 25, tees: 30, paintees: 35, chalees: 40, paintalees: 45, pachaas: 50, pachas: 50,
  saath: 60, sattar: 70, assi: 80, nabbe: 90, dedh: 1.5, dhai: 2.5, sarhe: 0, aadha: 0.5, adha: 0.5, pao: 0.25,

  // Urdu Script
  'ایک': 1, 'دو': 2, 'تین': 3, 'چار': 4, 'پانچ': 5, 'چھ': 6, 'سات': 7, 'آٹھ': 8, 'نو': 9,
  'دس': 10, 'گیارہ': 11, 'بارہ': 12, 'تیرہ': 13, 'چودہ': 14, 'پندرہ': 15, 'سولہ': 16, 'سترہ': 17, 'اٹھارہ': 18, 'انیس': 19,
  'بیس': 20, 'پچیس': 25, 'تیس': 30, 'پینتیس': 35, 'چالیس': 40, 'پینتالیس': 45, 'پچاس': 50,
  'ساٹھ': 60, 'ستر': 70, 'اسی': 80, 'نوے': 90, 'ڈیڑھ': 1.5, 'ڈھائی': 2.5, 'ساڑھے': 0, 'آدھا': 0.5, 'پاؤ': 0.25,

  // English
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  half: 0.5,
};

const MULT: Record<string, number> = {
  // Roman Urdu & English
  sau: 100, so: 100, hundred: 100,
  hazaar: 1000, hazar: 1000, thousand: 1000, k: 1000,
  lakh: 100000, lac: 100000,
  crore: 10000000, cr: 10000000, million: 1000000,

  // Urdu Script
  'سو': 100, 'سوک': 100,
  'ہزار': 1000,
  'لاکھ': 100000,
  'کروڑ': 10000000, 'ملین': 1000000,
};

/** "paanch hazaar" -> 5000, "پانچ ہزار" -> 5000, "۵۰۰۰" -> 5000, "5k" -> 5000, "dedh lakh" -> 150000, "Rs 2,500" -> 2500 */
export function parseAmount(text: string): number | null {
  if (!text) return null;
  const t = normalizeUrduDigits(text.toLowerCase().replace(/,/g, ''));
  const digit = t.match(/(\d+(\.\d+)?)\s*(k|hazaar|hazar|thousand|lakh|lac|crore|sau|hundred|ہزار|لاکھ|سو|کروڑ)?\b/i);
  if (digit) return Math.round(parseFloat(digit[1]) * (digit[3] ? (MULT[digit[3].toLowerCase()] ?? 1) : 1));
  let total = 0;
  let cur = 0;
  let found = false;
  let sarhe = false;
  for (const w of t.split(/\s+/)) {
    if (w === 'sarhe' || w === 'sadhe' || w === 'ساڑھے') { sarhe = true; found = true; continue; }
    if (w in WORDS) { cur += WORDS[w] + (sarhe ? 0.5 : 0); sarhe = false; found = true; }
    else if (w in MULT) { total += (cur || 1) * MULT[w]; cur = 0; found = true; }
  }
  total += cur;
  return found && total > 0 ? Math.round(total) : null;
}

const PURPOSE_WORDS: [RegExp, Purpose][] = [
  [/rashan|grocer|sabzi|doodh|kiryana|khana|roti|sauda|meat|gosht|chawal|aata|cheeni|chai|راشن|سبزی|دودھ|کریانہ|سودا|کھانا|روٹی|گوشت|چاول|آٹا|چینی|چائے/i, 'groceries'],
  [/school|fee|tuition|college|kitab|books?|uniform|اسکول|فیس|ٹیوشن|کالج|کتاب|یونیفارم/i, 'school'],
  [/rent|kiraya|makaan|dukan|کرایہ|مکان|دکان/i, 'rent'],
  [/ammi|abbu|bhai|behen|family|ghar\s*walon|amma|walid|walida|bachon|kids|امی|ابو|بھائی|بہن|فیملی|والد|والدہ|بچوں|گھر/i, 'family'],
  [/doctor|dawai|medicine|hospital|medical|ilaj|test|clinic|ڈاکٹر|دوائی|دوا|ہسپتال|علاج|کلینک/i, 'medical'],
  [/bill|bijli|gas|paani|internet|wifi|phone|mobile|recharge|load|بل|بجلی|گیس|پانی|انٹرنیٹ|وائی فائی|موبائل|لوڈ/i, 'bills'],
  [/gift|tohfa|shaadi|salami|eidi|hadiya|تحفہ|شادی|سلامی|عیدی|ہدیہ/i, 'gift'],
];

export function guessPurpose(text: string): Purpose | null {
  return PURPOSE_WORDS.find(([re]) => re.test(text))?.[1] ?? null;
}

/** Parse a bank debit SMS for amount + type (P1 extra). */
export function parseDebitSms(sms: string): { amount: number | null; source: LedgerSource; date: string | null } {
  const norm = normalizeUrduDigits(sms);
  const amt = norm.match(/(?:rs\.?|pkr|روپے)\s*([\d,]+(?:\.\d{1,2})?)/i);
  const source: LedgerSource = /atm|cash\s*withdraw|نقد/i.test(sms) ? 'atm' : /transfer|ibft|raast|sent|بھیجے/i.test(sms) ? 'transfer' : 'other';
  const d = norm.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  const date = d ? `${d[3].length === 2 ? '20' + d[3] : d[3]}-${d[2].padStart(2, '0')}-${d[1].padStart(2, '0')}` : null;
  return { amount: amt ? parseFloat(amt[1].replace(/,/g, '')) : null, source, date };
}
