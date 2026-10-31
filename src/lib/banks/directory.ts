/**
 * Official bank contact directory.
 * Every "verified" value was read from the bank's OWN website on 2026-10-31 (source URL kept per entry).
 * Anything not found on an official page is listed under `unverified` and must not be shown as official.
 */
export interface BankInfo {
  id: 'hbl' | 'ubl' | 'mcb' | 'meezan' | 'nbp' | 'abl';
  name: string;
  urdu: string;
  app: string; // name of the bank's mobile app as the user sees it in the store
  appVerified: boolean;
  helplines: string[]; // official phone numbers (verified)
  callerIds: string[]; // numbers the bank says it calls FROM (verified)
  domains: string[]; // official website / email domains
  emails: string[]; // verified official email addresses
  smsShortCodes: string[]; // verified SMS short codes
  source: string; // official page used
  verifiedOn: string;
  unverified: string[]; // honest notes
}

export const BANKS: BankInfo[] = [
  {
    id: 'hbl', name: 'HBL', urdu: 'ایچ بی ایل', app: 'HBL Mobile', appVerified: false,
    helplines: ['111-111-425', '+92-21-111-111-425'],
    callerIds: ['14250', '14251', '021-38722223'],
    domains: ['hbl.com'], emails: ['customer.care@hbl.com'], smsShortCodes: ['4250'],
    source: 'https://www.hbl.com/contact-us', verifiedOn: '2026-10-31',
    unverified: ['App name not checked on the store', 'Alphanumeric SMS sender ID not published on contact page'],
  },
  {
    id: 'ubl', name: 'UBL', urdu: 'یو بی ایل', app: 'UBL Digital', appVerified: false,
    helplines: ['111-825-888'], callerIds: [],
    domains: ['ubldigital.com', 'ubl.com.pk'], emails: ['customer.services@ubl.com.pk'], smsShortCodes: [],
    source: 'https://ubldigital.com/More/ContactUs', verifiedOn: '2026-10-31',
    unverified: ['App name not checked on the store', 'SMS sender ID / short code not published on contact page'],
  },
  {
    id: 'mcb', name: 'MCB', urdu: 'ایم سی بی', app: 'MCB Live', appVerified: true,
    helplines: ['111-000-622'], callerIds: [],
    domains: ['mcb.com.pk'], emails: [], smsShortCodes: [],
    source: 'https://mcb.com.pk/self-service-channels/personal-services-call-center', verifiedOn: '2026-10-31',
    unverified: ['Official email not shown on the call-center page', 'SMS sender ID not published'],
  },
  {
    id: 'meezan', name: 'Meezan Bank', urdu: 'میزان بینک', app: 'Meezan Mobile Banking', appVerified: false,
    helplines: ['111-331-331', '111-331-332'], callerIds: [],
    domains: ['meezanbank.com'], emails: [], smsShortCodes: [],
    source: 'https://meezanbank.com/?p=463', verifiedOn: '2026-10-31',
    unverified: ['App name not checked on the store', 'Official email is masked on the contact page', 'SMS sender ID not published'],
  },
  {
    id: 'nbp', name: 'National Bank (NBP)', urdu: 'نیشنل بینک', app: 'NBP Digital', appVerified: true,
    helplines: ['111-627-627', '021-111-627-627'], callerIds: [],
    domains: ['nbp.com.pk'], emails: [], smsShortCodes: [],
    source: 'https://nbp.com.pk/HelpLine/main.aspx', verifiedOn: '2026-10-31',
    unverified: ['Official email not listed on the helpline page', 'SMS sender ID not published'],
  },
  {
    id: 'abl', name: 'Allied Bank (ABL)', urdu: 'الائیڈ بینک', app: 'myABL', appVerified: true,
    helplines: ['042-111-225-225'], callerIds: ['1222'],
    domains: ['abl.com'], emails: [], smsShortCodes: [],
    source: 'https://www.abl.com/services/customer-services/', verifiedOn: '2026-10-31',
    unverified: ['Official emails are masked on the page', 'SMS sender ID not published'],
  },
];

export const bankById = (id: string | null | undefined) => BANKS.find((b) => b.id === id) ?? null;

const digits = (s: string) => s.replace(/\D/g, '').replace(/^0092|^92/, '0');

export type ContactKind = 'phone' | 'email' | 'website' | 'sms';
export interface ContactVerdict {
  kind: ContactKind;
  status: 'official' | 'lookalike' | 'unknown' | 'personal_mobile';
  bank: BankInfo | null;
  explain: string;
}

/** Does `host` equal or sit under one of the official domains? (exact suffix match, no substring tricks) */
function officialDomain(host: string): BankInfo | null {
  const h = host.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
  return BANKS.find((b) => b.domains.some((d) => h === d || h.endsWith('.' + d))) ?? null;
}

const BRAND = /(hbl|habib|ubl|united|mcb|meezan|nbp|national|allied|abl)/i;

/**
 * Classify a phone number, SMS sender, email address or link against the verified directory.
 * IMPORTANT: "official" only means the number/domain belongs to the bank. Caller ID and email
 * sender can be faked (spoofing), so the advice is always to call back on the number from the card.
 */
export function checkContact(raw: string): ContactVerdict {
  const input = raw.trim();
  // email
  const em = input.match(/^[^\s@<>]+@([^\s@<>]+)$/) ?? input.match(/<[^\s@<>]+@([^\s@<>]+)>/);
  if (em) {
    const host = em[1];
    const bank = officialDomain(host);
    if (bank) return { kind: 'email', status: 'official', bank, explain: `"${host}" ${bank.name} ka asal domain hai. Lekin email ka "from" naqli bhi ho sakta hai: email mein diye link par kabhi click na karein, apni app khud kholein.` };
    if (BRAND.test(host)) return { kind: 'email', status: 'lookalike', bank: null, explain: `"${host}" bank ke naam jaisa hai lekin kisi bank ka asal domain NAHI. Yeh phishing (dhoka) email lagta hai.` };
    if (/(gmail|yahoo|hotmail|outlook)\./i.test(host)) return { kind: 'email', status: 'personal_mobile', bank: null, explain: 'Bank kabhi Gmail/Yahoo jaise personal email se message nahi bhejta.' };
    return { kind: 'email', status: 'unknown', bank: null, explain: 'Yeh domain hamari bank list mein nahi. Ehtiyat karein.' };
  }
  // website / link
  const url = input.match(/^(https?:\/\/)?([a-z0-9.-]+\.[a-z]{2,})(\/\S*)?$/i);
  if (url && !/^\d[\d.]*$/.test(url[2])) {
    const host = url[2];
    const bank = officialDomain(host);
    if (bank) return { kind: 'website', status: 'official', bank, explain: `"${host}" ${bank.name} ki asal website hai. Phir bhi link ke bajaye address khud type karein ya app istemal karein.` };
    if (BRAND.test(host)) return { kind: 'website', status: 'lookalike', bank: null, explain: `"${host}" bank ke naam ki naqal hai. Asal website nahi. Na kholein, kuch na likhein.` };
    return { kind: 'website', status: 'unknown', bank: null, explain: 'Yeh website hamari bank list mein nahi.' };
  }
  // phone / short code
  const d = digits(input);
  if (d.length >= 4) {
    for (const b of BANKS) {
      if (b.helplines.some((h) => digits(h) === d || digits(h).endsWith(d) && d.length >= 9)) return { kind: 'phone', status: 'official', bank: b, explain: `Yeh ${b.name} ki official helpline hai (${b.source}).` };
      if (b.callerIds.some((h) => digits(h) === d)) return { kind: 'phone', status: 'official', bank: b, explain: `${b.name} ki website ke mutabiq bank is number se call karta hai. Phir bhi OTP/PIN kabhi na batayein.` };
      if (b.smsShortCodes.includes(d)) return { kind: 'sms', status: 'official', bank: b, explain: `${d} ${b.name} ka official SMS short code hai.` };
    }
    if (/^03\d{9}$/.test(d)) return { kind: 'phone', status: 'personal_mobile', bank: null, explain: 'Yeh aam mobile number hai (03xx). Bank ki helpline 111 wale UAN numbers hain. Is number par bank ki koi baat na karein.' };
    return { kind: 'phone', status: 'unknown', bank: null, explain: 'Yeh number hamari verified list mein nahi. Bank ko sirf card ke peechay likhe number par call karein.' };
  }
  // alphanumeric SMS sender
  if (/^[a-z0-9 -]{3,15}$/i.test(input)) {
    return { kind: 'sms', status: 'unknown', bank: BRAND.test(input) ? null : null, explain: 'Banks ne apne SMS sender naam publicly list nahi kiye, is liye hum confirm nahi kar sakte. Naam asli lage tab bhi link na kholein.' };
  }
  return { kind: 'phone', status: 'unknown', bank: null, explain: 'Samajh nahi aaya. Number, email ya website likhein.' };
}
