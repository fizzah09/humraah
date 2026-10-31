/**
 * Deterministic scam rule engine (PRD F4). Message text is DATA, never instructions.
 * Verdict never says "safe" or "authentic".
 */
export type Verdict = 'likely_scam' | 'suspicious' | 'no_red_flags';

export interface RuleHit {
  rule: string;
  title: string;
  explainUr: string;
  explainRoman: string;
  match: string;
  weight: number;
  index: number;
}

interface Rule {
  id: string;
  title: string;
  explainUr: string;
  explainRoman: string;
  weight: number;
  pattern: RegExp;
}

const RULES: Rule[] = [
  {
    id: 'secret_request',
    title: 'Asks for OTP / PIN / password / CNIC / card details',
    explainUr: 'کوئی بھی بینک کبھی OTP، PIN یا پاس ورڈ نہیں مانگتا۔',
    explainRoman: 'Koi bhi bank kabhi OTP, PIN ya password nahi maangta.',
    weight: 5,
    pattern: /\b(otp|pin|password|passcode|cvv|cnic|card\s*(number|no)|verification\s*code|code\s*(bhej|share|bata))\b|او ٹی پی|پن کوڈ|پاس ورڈ|شناختی کارڈ/gi,
  },
  {
    id: 'urgency',
    title: 'Urgency or threat language',
    explainUr: 'جلدی یا دھمکی والی زبان دھوکے بازوں کا عام طریقہ ہے۔',
    explainRoman: 'Jaldi ya dhamki wali zabaan dhokay bazon ka aam tareeqa hai.',
    weight: 2,
    pattern: /\b(urgent|immediately|within\s*\d+\s*(hours?|minutes?|hrs?)|blocked|suspended|deactivat\w*|last\s*chance|final\s*warning|foran|fori|turant|band\s*ho\s*jaye|block\s*ho)\b|فوری|بند ہو جائے/gi,
  },
  {
    id: 'bait',
    title: 'Prize, lottery, refund or aid bait',
    explainUr: 'انعام، لاٹری یا امداد کے لالچ والے پیغامات اکثر جعلی ہوتے ہیں۔',
    explainRoman: 'Inaam, lottery ya imdaad ke laalach wale messages aksar jaali hote hain.',
    weight: 3,
    pattern: /\b(congratulations|you\s*(have\s*)?won|winner|prize|lottery|lucky\s*draw|reward|cash\s*back\s*of|refund|bisp|benazir|ehsaas|inaam|jeet\s*gaye|mubarak\s*ho)\b|انعام|مبارک ہو|بینظیر|احساس پروگرام/gi,
  },
  {
    id: 'short_link',
    title: 'Shortened or suspicious link',
    explainUr: 'چھوٹے یا عجیب لنک اصل ویب سائٹ چھپاتے ہیں۔ لنک نہ کھولیں۔',
    explainRoman: 'Chhotay ya ajeeb link asal website chhupatay hain. Link na kholein.',
    weight: 3,
    pattern: /\b(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|cutt\.ly|rb\.gy|shorturl\.at|tiny\.cc|wa\.me)\/\S*|https?:\/\/\d{1,3}(\.\d{1,3}){3}\S*|https?:\/\/\S+\.(xyz|top|click|live|info|online|site|icu|buzz)\b\S*/gi,
  },
  {
    id: 'lookalike',
    title: 'Lookalike bank website',
    explainUr: 'یہ لنک بینک کے نام سے ملتا جلتا ہے لیکن اصل ویب سائٹ نہیں لگتا۔',
    explainRoman: 'Yeh link bank ke naam se milta julta hai lekin asal website nahi lagta.',
    weight: 4,
    pattern: /https?:\/\/(?![\w.-]*\b(meezanbank\.com|hbl\.com|ubldigital\.com|ubl\.com\.pk|mcb\.com\.pk|nbp\.com\.pk|abl\.com|bankalfalah\.com|easypaisa\.com\.pk|jazzcash\.com\.pk|sbp\.org\.pk)\b)[\w.-]*(meezan|hbl|ubl|mcb|nbp|allied|abl|alfalah|easypaisa|jazzcash|sbp|statebank)[\w.-]*\S*/gi,
  },
  {
    id: 'pay_personal',
    title: 'Asks to pay / send money to a personal number or account',
    explainUr: 'کسی ذاتی نمبر یا اکاؤنٹ میں پیسے بھیجنے کا کہنا خطرے کی نشانی ہے۔',
    explainRoman: 'Kisi zaati number ya account mein paise bhejne ka kehna khatray ki nishani hai.',
    weight: 3,
    pattern: /\b(send|transfer|pay|deposit|bhej(ein|o|en)?|jama\s*kar\w*)\b[^.\n]{0,40}\b(0?3\d{2}[-\s]?\d{7}|account|easypaisa|jazzcash|fee|charges|processing)\b/gi,
  },
  {
    id: 'install_app',
    title: 'Asks to install an app or share screen',
    explainUr: 'کسی کے کہنے پر ایپ انسٹال کرنا یا اسکرین شیئر کرنا خطرناک ہے۔',
    explainRoman: 'Kisi ke kehne par app install karna ya screen share karna khatarnak hai.',
    weight: 4,
    pattern: /\b(install|download)\b[^.\n]{0,30}\b(app|apk|anydesk|teamviewer|quicksupport)\b|\b(anydesk|teamviewer|\.apk|screen\s*share)\b/gi,
  },
  {
    id: 'call_number',
    title: 'Asks you to call a mobile number',
    explainUr: 'بینک کا اصل نمبر صرف آپ کے کارڈ کے پیچھے لکھا ہوتا ہے۔',
    explainRoman: 'Bank ka asal number sirf aap ke card ke peechay likha hota hai.',
    weight: 2,
    pattern: /\b(call|contact|rabta|phone\s*kar\w*)\b[^.\n]{0,25}\b0?3\d{2}[-\s]?\d{7}\b/gi,
  },
];

export interface ScamResult {
  verdict: Verdict;
  score: number;
  hits: RuleHit[];
  senderMismatch: boolean;
}


export function checkMessage(text: string, claimedSender?: string): ScamResult {
  const hits: RuleHit[] = [];
  for (const r of RULES) {
    r.pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    const seen = new Set<string>();
    while ((m = r.pattern.exec(text))) {
      const key = m[0].toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        hits.push({ rule: r.id, title: r.title, explainUr: r.explainUr, explainRoman: r.explainRoman, match: m[0], weight: r.weight, index: m.index });
      }
      if (m[0].length === 0) r.pattern.lastIndex++;
    }
  }

  let senderMismatch = false;
  if (claimedSender && claimedSender.trim()) {
    const s = claimedSender.trim().toUpperCase().replace(/\s+/g, '');
    const looksLikeMobile = /^(\+?92|0)?3\d{9}$/.test(s);
    const mentionsBank = /(meezan|hbl|ubl|mcb|nbp|allied|alfalah|bank|easypaisa|jazzcash)/i.test(text);
    // Banks do not publish their alphanumeric SMS sender names, so we only flag what we can prove:
    // a message about a bank that came from an ordinary mobile number.
    senderMismatch = mentionsBank && looksLikeMobile;
  }

  // Score: distinct-rule weights (count each rule once) + sender mismatch.
  const byRule = new Map<string, number>();
  hits.forEach((h) => byRule.set(h.rule, h.weight));
  let score = [...byRule.values()].reduce((a, b) => a + b, 0);
  if (senderMismatch) score += 3;

  const verdict: Verdict =
    byRule.has('secret_request') || byRule.has('install_app') || byRule.has('lookalike') || score >= 5
      ? 'likely_scam'
      : score >= 2
        ? 'suspicious'
        : 'no_red_flags';

  return { verdict, score, hits: hits.sort((a, b) => a.index - b.index), senderMismatch };
}

export const VERDICT_TEXT: Record<Verdict, { en: string; ur: string; roman: string }> = {
  likely_scam: { en: 'Likely scam', ur: 'غالباً دھوکہ ہے', roman: 'Ghaliban dhoka hai' },
  suspicious: { en: 'Suspicious, verify first', ur: 'مشکوک ہے، پہلے تصدیق کریں', roman: 'Mashkook hai, pehle tasdeeq karein' },
  no_red_flags: {
    en: 'No red flags found. Still verify through your own app.',
    ur: 'کوئی خطرے کی نشانی نہیں ملی۔ پھر بھی اپنی ایپ سے تصدیق کریں۔',
    roman: 'Koi khatray ki nishani nahi mili. Phir bhi apni app se tasdeeq karein.',
  },
};
