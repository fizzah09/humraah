/**
 * Fee & tax glossary. NOT YET VERIFIED: confirm each entry against the bank's
 * schedule of charges before the demo (PRD F2 note).
 */
export interface GlossaryEntry {
  id: string;
  pattern: RegExp;
  name: string;
  ur: string;
  roman: string;
  source: string;
  lastVerified: string | null;
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    id: 'wht_236p',
    pattern: /\b(wht|w\.h\.t|withholding|236p|231a)\b/i,
    name: 'Withholding tax',
    ur: 'یہ حکومت کا ٹیکس ہے جو بینک کچھ لین دین پر کاٹ کر جمع کرواتا ہے۔',
    roman: 'Yeh hukoomat ka tax hai jo bank kuch len-den par kaat kar jama karwata hai.',
    source: 'Income Tax Ordinance 2001 (to verify)',
    lastVerified: null,
  },
  {
    id: 'fed',
    pattern: /\b(fed|federal\s*excise)\b/i,
    name: 'Federal Excise Duty',
    ur: 'بینک کی فیس پر لگنے والا سرکاری ٹیکس۔',
    roman: 'Bank ki fee par lagne wala sarkari tax.',
    source: 'Bank schedule of charges (to verify)',
    lastVerified: null,
  },
  {
    id: 'atm_fee',
    pattern: /\b(atm\s*(fee|charge|chg)|other\s*bank\s*atm|1link\s*(fee|chg))\b/i,
    name: 'ATM withdrawal charge',
    ur: 'کسی دوسرے بینک کے ATM سے پیسے نکالنے کی فیس۔',
    roman: 'Kisi doosray bank ke ATM se paise nikalne ki fee.',
    source: 'Bank schedule of charges (to verify)',
    lastVerified: null,
  },
  {
    id: 'sms_alert',
    pattern: /\b(sms\s*(alert|charges?|fee)|e-?alert)\b/i,
    name: 'SMS alert charges',
    ur: 'ہر لین دین پر SMS بھیجنے کی سروس کی فیس۔',
    roman: 'Har len-den par SMS bhejne ki service ki fee.',
    source: 'Bank schedule of charges (to verify)',
    lastVerified: null,
  },
  {
    id: 'card_fee',
    pattern: /\b(debit\s*card\s*(fee|annual|charges?)|card\s*annual|card\s*issuance)\b/i,
    name: 'Debit card annual fee',
    ur: 'ڈیبٹ کارڈ کی سالانہ فیس۔',
    roman: 'Debit card ki saalana fee.',
    source: 'Bank schedule of charges (to verify)',
    lastVerified: null,
  },
  {
    id: 'ibft_fee',
    pattern: /\b(ibft\s*(fee|chg|charges?)|fund\s*transfer\s*(fee|charges?))\b/i,
    name: 'Inter-bank transfer fee',
    ur: 'دوسرے بینک میں پیسے بھیجنے کی فیس۔',
    roman: 'Doosray bank mein paise bhejne ki fee.',
    source: 'Bank schedule of charges (to verify)',
    lastVerified: null,
  },
  {
    id: 'zakat_ded',
    pattern: /\b(zakat\s*(deduct|ded|u\/s))\b/i,
    name: 'Zakat deduction',
    ur: 'رمضان میں بینک کی طرف سے کاٹی گئی زکوٰۃ (اگر آپ نے استثنیٰ فارم جمع نہیں کیا)۔',
    roman: 'Ramzan mein bank ki taraf se kaati gayi zakat (agar aap ne istisna form jama nahi kiya).',
    source: 'Zakat & Ushr Ordinance 1980 (to verify)',
    lastVerified: null,
  },
  {
    id: 'min_balance',
    pattern: /\b(min(imum)?\s*bal(ance)?\s*(fee|chg|charges?)|below\s*min)\b/i,
    name: 'Minimum balance charge',
    ur: 'اکاؤنٹ میں کم از کم رقم نہ ہونے پر لگنے والی فیس۔',
    roman: 'Account mein kam az kam raqam na honay par lagne wali fee.',
    source: 'Bank schedule of charges (to verify)',
    lastVerified: null,
  },
];

export function lookupFee(description: string): GlossaryEntry | null {
  return GLOSSARY.find((g) => g.pattern.test(description)) ?? null;
}
