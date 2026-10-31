import { normDate } from '../statements/parse';

export interface BillDraft {
  billerType: string;
  amount: number | null;
  dueDate: string | null;
  consumerMasked: string | null;
}

const BILLERS: [RegExp, string][] = [
  [/k-?electric|\bke\b|lesco|iesco|mepco|fesco|pesco|gepco|hesco|wapda|electricity/i, 'Electricity (Bijli)'],
  [/sngpl|ssgc|sui\s*(northern|southern)|gas/i, 'Gas'],
  [/wasa|kwsc|water/i, 'Water (Paani)'],
  [/ptcl|internet|broadband|nayatel|stormfiber/i, 'Internet / Phone'],
  [/jazz|telenor|zong|ufone|mobile/i, 'Mobile'],
  [/school|tuition|fee\s*voucher/i, 'School fee'],
];

/**
 * Deterministic validator over OCR text from a bill photo (PRD F6-1).
 * The user always confirms the values before saving.
 */
export function extractBill(text: string): BillDraft {
  const billerType = BILLERS.find(([re]) => re.test(text))?.[1] ?? 'Other';

  let amount: number | null = null;
  const amtRe = /(payable\s*(within\s*due\s*date)?|amount\s*(due|payable)|total\s*(amount|payable)|net\s*payable)[^\d]{0,20}([\d,]{2,9}(\.\d{1,2})?)/gi;
  const m = amtRe.exec(text);
  if (m) amount = parseFloat(m[5].replace(/,/g, ''));
  if (amount === null) {
    const rs = [...text.matchAll(/(?:rs\.?|pkr)\s*([\d,]{2,9})/gi)].map((x) => parseFloat(x[1].replace(/,/g, '')));
    if (rs.length) amount = Math.max(...rs);
  }

  let dueDate: string | null = null;
  const dm = text.match(/due\s*date[^\d]{0,15}(\d{1,2}[\s/.-](?:\d{1,2}|[A-Za-z]{3,9})[\s/.-]\d{2,4})/i);
  if (dm) dueDate = normDate(dm[1].replace(/([A-Za-z]{3})[a-z]+/, '$1'));

  let consumerMasked: string | null = null;
  const cm = text.match(/(consumer|reference|ref|account)\s*(no|number|#)?[^\d]{0,8}(\d[\d\s-]{6,})/i);
  if (cm) {
    const d = cm[3].replace(/\D/g, '');
    consumerMasked = '•••• ' + d.slice(-4);
  }

  if (amount !== null && (amount <= 0 || amount > 5_000_000)) amount = null;
  return { billerType, amount, dueDate, consumerMasked };
}

export function reminderDates(due: string): { label: string; date: string }[] {
  const d = new Date(due + 'T09:00:00');
  const minus = (n: number) => new Date(d.getTime() - n * 86400000).toISOString().slice(0, 10);
  return [
    { label: '7 din pehle', date: minus(7) },
    { label: '2 din pehle', date: minus(2) },
    { label: 'Due date', date: due },
  ];
}

/** .ics calendar export with 3 alarms (7 days, 2 days, due date). */
export function toIcs(b: { id: string; billerType: string; amount: number; dueDate: string }): string {
  const ds = b.dueDate.replace(/-/g, '');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Humraah//Bills//EN',
    'BEGIN:VEVENT', `UID:${b.id}@banksaathi`, `DTSTAMP:${ds}T090000`, `DTSTART;VALUE=DATE:${ds}`,
    `SUMMARY:${b.billerType} bill due - Rs. ${b.amount}`,
    'DESCRIPTION:Pay in your own bank app. Humraah reminder.',
    'BEGIN:VALARM', 'TRIGGER:-P7D', 'ACTION:DISPLAY', 'DESCRIPTION:Bill due in 7 days', 'END:VALARM',
    'BEGIN:VALARM', 'TRIGGER:-P2D', 'ACTION:DISPLAY', 'DESCRIPTION:Bill due in 2 days', 'END:VALARM',
    'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Bill due today', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}
