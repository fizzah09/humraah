/**
 * Task guides that work for every supported bank app (HBL, UBL, MCB, Meezan, NBP, ABL).
 *
 * HONESTY RULE: we do NOT claim exact button names for any bank. Banks do not publish
 * button-by-button guides and their apps change often. Each step lists the label variants
 * that banking apps commonly use; the assistant reads the user's actual screenshot (OCR / AI)
 * and quotes whichever label is really on the screen. If none is found it says so.
 * Before a demo, walk your own app and add its exact labels to `targets` (first = preferred).
 */
import { BANKS } from '../banks/directory';

export interface PlaybookStep {
  screen: string;
  expectLabels: string[]; // words that suggest the user is on this screen
  targets: string[]; // label variants for the button to tap, matched against the screenshot
  ur: string; // use {label} where the on-screen label goes
  roman: string;
  why: string; // plain-language reason, so the user learns the pattern (teach, don't do)
  moneyStep?: boolean;
}

export interface Playbook {
  task: 'check_balance' | 'send_money' | 'pay_bill';
  title: string;
  steps: PlaybookStep[];
  recap: string[];
}

export const PLAYBOOKS: Playbook[] = [
  {
    task: 'check_balance',
    title: 'Balance dekhna',
    steps: [
      { screen: 'Home', expectLabels: ['Accounts', 'Home', 'Dashboard', 'My Accounts', 'Transfer'], targets: ['My Accounts', 'Accounts', 'Account Summary', 'Balance'], ur: '"{label}" پر ٹیپ کریں۔', roman: '"{label}" par tap karein.', why: 'Balance aksar "Accounts" ya "Account Summary" ke andar hota hai.' },
      { screen: 'Accounts', expectLabels: ['Available Balance', 'Balance', 'Current Account', 'Savings'], targets: ['Available Balance', 'Available', 'Balance'], ur: 'آپ کا بیلنس "{label}" کے ساتھ لکھا ہے۔', roman: 'Aap ka balance "{label}" ke saath likha hai.', why: '"Available" wala balance hi abhi kharch ho sakta hai.' },
    ],
    recap: ['App khol kar "Accounts" jaisa button dabaya.', '"Available Balance" mein apna balance dekha.', 'Agli baar khud yahi 2 qadam karein.'],
  },
  {
    task: 'send_money',
    title: 'Paise bhejna (saved shakhs ko)',
    steps: [
      { screen: 'Home', expectLabels: ['Transfer', 'Send Money', 'Payments', 'Accounts'], targets: ['Fund Transfer', 'Funds Transfer', 'Send Money', 'Transfer', 'Transfers'], ur: '"{label}" پر ٹیپ کریں۔', roman: '"{label}" par tap karein.', why: '"Transfer" ka matlab hai paise ek account se doosre mein bhejna.' },
      { screen: 'Transfer menu', expectLabels: ['Beneficiary', 'Saved', 'Payee', 'New', 'Raast'], targets: ['Saved Beneficiary', 'Beneficiaries', 'Saved Payees', 'Beneficiary', 'Payee'], ur: '"{label}" پر ٹیپ کریں اور جس کو بھیجنا ہے اس کا نام چنیں۔', roman: '"{label}" par tap karein aur jis ko bhejna hai us ka naam chunein.', why: '"Beneficiary/Payee" woh shakhs hai jise paise milenge. Saved wale mein account number ghalat hone ka khatra nahi.' },
      { screen: 'Amount', expectLabels: ['Amount', 'Purpose', 'Next', 'Remarks'], targets: ['Amount'], ur: '"{label}" میں رقم لکھیں، پھر آگے بڑھیں۔', roman: '"{label}" mein raqam likhein, phir aagay barhein.', why: 'Ek zero zyada lagne se 10 guna paise chalay jatay hain. Likh kar dobara gin lein.' },
      { screen: 'Review / Confirm', expectLabels: ['Confirm', 'Review', 'Beneficiary Name', 'Account Title'], targets: ['Confirm', 'Transfer Now', 'Send', 'Proceed'], ur: 'رکیں! نام اور رقم دوبارہ چیک کریں۔ صحیح ہو تو "{label}" دبائیں۔ OTP کسی کو نہ بتائیں۔', roman: 'Rukein! Naam aur raqam dobara check karein. Sahi ho to "{label}" dabayein. OTP kisi ko na batayein.', why: 'Confirm ke baad paise wapas nahi aatay, is liye yeh aakhri check hai.', moneyStep: true },
      { screen: 'Success', expectLabels: ['Successful', 'Success', 'Transaction ID', 'Reference', 'Done'], targets: ['Done', 'Close', 'Home', 'OK'], ur: 'مبارک ہو، پیسے چلے گئے۔ "{label}" دبائیں۔', roman: 'Mubarak ho, paise chalay gaye. "{label}" dabayein.', why: 'Transaction ID ka screenshot rakh lein, shikayat mein kaam aata hai.' },
    ],
    recap: ['"Transfer" mein saved shakhs chuna.', 'Raqam likhi aur naam/raqam check kar ke Confirm kiya.', 'OTP sirf apni app mein dala, kisi ko nahi bataya.'],
  },
  {
    task: 'pay_bill',
    title: 'Bill pay karna',
    steps: [
      { screen: 'Home', expectLabels: ['Payments', 'Bill', 'Pay', 'Transfer'], targets: ['Bill Payment', 'Pay Bills', 'Bills', 'Payments', 'Utility Bills'], ur: '"{label}" پر ٹیپ کریں۔', roman: '"{label}" par tap karein.', why: 'Bijli, gas, paani sab "Bill Payment" jaisi jagah milte hain.' },
      { screen: 'Bill type', expectLabels: ['Electricity', 'Gas', 'Water', 'Telecom', 'Utility'], targets: ['Electricity', 'Gas', 'Water', 'Utility'], ur: 'اپنے بل کی قسم چنیں، مثلاً "{label}"۔', roman: 'Apne bill ki qisam chunein, maslan "{label}".', why: 'Bill ke upar company ka naam dekhein (K-Electric, SNGPL, waghera).' },
      { screen: 'Consumer number', expectLabels: ['Consumer', 'Reference', 'Fetch', 'Company'], targets: ['Consumer Number', 'Consumer No', 'Reference Number', 'Customer ID'], ur: 'بل پر لکھا "{label}" ڈالیں اور آگے بڑھیں۔', roman: 'Bill par likha "{label}" daalein aur aagay barhein.', why: 'Yeh aap ke ghar ka bill number hai, bill ke upar likha hota hai.' },
      { screen: 'Confirm payment', expectLabels: ['Confirm', 'Amount Due', 'Pay Now', 'Due Date'], targets: ['Pay Now', 'Pay', 'Confirm', 'Proceed'], ur: 'رکیں! کمپنی کا نام اور رقم بل سے ملائیں۔ صحیح ہو تو "{label}" دبائیں۔', roman: 'Rukein! Company ka naam aur raqam bill se milayein. Sahi ho to "{label}" dabayein.', why: 'Raqam bill se milane se ghalat ya purane bill ki payment se bachtay hain.', moneyStep: true },
      { screen: 'Success', expectLabels: ['Successful', 'Paid', 'Done', 'Receipt'], targets: ['Done', 'Close', 'OK'], ur: 'بل ادا ہو گیا۔ "{label}" دبائیں۔', roman: 'Bill ada ho gaya. "{label}" dabayein.', why: 'Payment ka saboot app ki "History" ya "Statement" mein bhi milta hai.' },
    ],
    recap: ['"Bill Payment" mein bill ki qisam chuni.', 'Consumer number dala aur raqam bill se milayi.', 'Pay kar ke receipt dekhi.'],
  },
];

export function detectBank(text: string): string | null {
  const t = text.toLowerCase();
  if (/meezan|میزان/.test(t)) return 'meezan';
  if (/\bhbl\b|habib bank/.test(t)) return 'hbl';
  if (/\bubl\b|united bank/.test(t)) return 'ubl';
  if (/\bmcb\b|muslim commercial/.test(t)) return 'mcb';
  if (/\bnbp\b|national bank|نیشنل/.test(t)) return 'nbp';
  if (/\babl\b|allied|الائیڈ|myabl/.test(t)) return 'abl';
  return null;
}

export const bankName = (id: string | null) => BANKS.find((b) => b.id === id)?.name ?? null;

export function detectTask(text: string): Playbook['task'] | null {
  const t = text.toLowerCase();
  if (/bill|بل/.test(t)) return 'pay_bill';
  if (/paise\s*bhej|send|transfer|bhejn|بھیج|ٹرانسفر/.test(t)) return 'send_money';
  if (/balance|baqaya|kitne\s*paise|بیلنس/.test(t)) return 'check_balance';
  return null;
}

export function findPlaybook(task: string | null) {
  return PLAYBOOKS.find((p) => p.task === task) ?? null;
}

/** Which of the step's label variants is really on the screen? */
export function pickTarget(step: PlaybookStep, ocr?: string): { label: string; seen: boolean } {
  const t = (ocr ?? '').toLowerCase();
  const hit = step.targets.find((l) => t.includes(l.toLowerCase()));
  return hit ? { label: hit, seen: true } : { label: step.targets[0], seen: false };
}
