import type { Transaction, TxCategory } from '../types';
import { maskDigits, uid } from '../format';
import { lookupFee } from './glossary';

export function categorize(desc: string, debit: number, credit: number): TxCategory {
  const d = desc.toLowerCase();
  if (/\b(wht|fed|fee|charge|chg|tax|sms alert|annual|zakat)\b/.test(d)) return 'fee';
  if (/\b(atm|cash\s*withdrawal|cwd)\b/.test(d)) return 'atm';
  if (/\b(salary|payroll)\b/.test(d) && credit > 0) return 'income';
  if (/\b(profit|interest|return)\b/.test(d) && credit > 0) return 'profit';
  if (/\b(raast|ibft|ift|transfer|trf|funds?\s*trans)\b/.test(d)) return credit > 0 ? 'income' : 'transfer';
  if (/\b(bill|kelectric|k-electric|sngpl|ssgc|lesco|ptcl|wasa|utility|mobilink|jazz|telenor|zong)\b/.test(d)) return 'bill';
  if (/\b(pos|purchase|visa|mastercard|paypak|daraz|foodpanda|online)\b/.test(d)) return 'card';
  if (credit > 0) return 'income';
  return 'other';
}

const num = (s: string | undefined) => {
  if (!s) return 0;
  const v = parseFloat(s.replace(/[,\s]|rs\.?|pkr/gi, ''));
  return isNaN(v) ? 0 : Math.abs(v);
};

const MONTHS: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

export function normDate(s: string): string | null {
  s = s.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/); // dd/mm/yyyy (PK format)
  if (m) {
    const y = m[3].length === 2 ? '20' + m[3] : m[3];
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  m = s.match(/^(\d{1,2})[\s-]([A-Za-z]{3})[a-z]*[\s-](\d{2,4})$/);
  if (m && MONTHS[m[2].toLowerCase()]) {
    const y = m[3].length === 2 ? '20' + m[3] : m[3];
    return `${y}-${MONTHS[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

export interface ParsedStatement {
  transactions: Transaction[];
  openingBalance: number | null;
  closingBalance: number | null;
  integrityOk: boolean | null;
  suspectRowIds: string[];
}

/**
 * Bank adapter for CSV with header: Date, Description, Debit, Credit, Balance.
 * Column names are matched loosely so most exported statements work.
 */
export function parseCsv(text: string): ParsedStatement {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const headerIdx = lines.findIndex((l) => /date/i.test(l) && /(debit|withdraw)/i.test(l));
  if (headerIdx < 0) return parseText(text);
  const header = splitCsvLine(lines[headerIdx]).map((h) => h.toLowerCase());
  const col = (re: RegExp) => header.findIndex((h) => re.test(h));
  const ci = { date: col(/date/), desc: col(/desc|narration|particular|detail/), debit: col(/debit|withdraw/), credit: col(/credit|deposit/), bal: col(/balance/) };
  const txs: Transaction[] = [];
  let opening: number | null = null;
  for (const l of lines.slice(headerIdx + 1)) {
    const c = splitCsvLine(l);
    const desc = c[ci.desc] ?? '';
    if (/opening\s*balance/i.test(desc) || /opening\s*balance/i.test(l)) { opening = num(c[ci.bal]); continue; }
    const date = normDate(c[ci.date] ?? '');
    if (!date) continue;
    const debit = num(c[ci.debit]);
    const credit = num(c[ci.credit]);
    txs.push({ id: uid(), date, description: maskDigits(desc), debit, credit, balance: ci.bal >= 0 && c[ci.bal] ? num(c[ci.bal]) : undefined, category: categorize(desc, debit, credit) });
  }
  return withIntegrity(txs, opening);
}

/** Fallback for OCR / pasted text: "dd/mm/yyyy description amount [DR|CR] balance". */
export function parseText(text: string): ParsedStatement {
  const txs: Transaction[] = [];
  let opening: number | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/opening\s*balance/i.test(line)) {
      const n = line.match(/([\d,]+\.?\d*)\s*$/);
      if (n) opening = num(n[1]);
      continue;
    }
    const m = line.match(/^(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}[\s-][A-Za-z]{3}[\s-]\d{2,4})\s+(.+?)\s+([\d,]+\.?\d*)\s*(dr|cr)?\s+([\d,]+\.?\d*)$/i);
    if (!m) continue;
    const date = normDate(m[1]);
    if (!date) continue;
    const amt = num(m[3]);
    const isCredit = m[4]?.toLowerCase() === 'cr' || /salary|profit|received|credit|deposit/i.test(m[2]);
    const debit = isCredit ? 0 : amt;
    const credit = isCredit ? amt : 0;
    txs.push({ id: uid(), date, description: maskDigits(m[2]), debit, credit, balance: num(m[5]), category: categorize(m[2], debit, credit) });
  }
  return withIntegrity(txs, opening);
}

function withIntegrity(txs: Transaction[], opening: number | null): ParsedStatement {
  if (opening === null && txs[0]?.balance !== undefined) {
    opening = txs[0].balance! + txs[0].debit - txs[0].credit;
  }
  const last = [...txs].reverse().find((t) => t.balance !== undefined);
  const closing = last?.balance ?? null;
  const suspect: string[] = [];
  let running = opening;
  for (const t of txs) {
    if (running !== null && t.balance !== undefined) {
      const expected = running - t.debit + t.credit;
      if (Math.abs(expected - t.balance) > 0.5) suspect.push(t.id);
      running = t.balance;
    }
  }
  let ok: boolean | null = null;
  if (opening !== null && closing !== null) {
    const sum = opening + txs.reduce((s, t) => s + t.credit - t.debit, 0);
    ok = Math.abs(sum - closing) < 0.5 && suspect.length === 0;
  }
  return { transactions: txs, openingBalance: opening, closingBalance: closing, integrityOk: ok, suspectRowIds: suspect };
}

export interface Anomaly { txId: string; reason: string }

export function findAnomalies(txs: Transaction[]): Anomaly[] {
  const out: Anomaly[] = [];
  const debits = txs.filter((t) => t.debit > 0);
  const sortedAmts = debits.map((t) => t.debit).sort((a, b) => a - b);
  const median = sortedAmts.length ? sortedAmts[Math.floor(sortedAmts.length / 2)] : 0;
  const seen = new Map<string, Transaction>();
  for (const t of debits) {
    const key = `${t.date}|${t.debit}|${t.description.toLowerCase()}`;
    if (seen.has(key) && t.category !== 'atm') out.push({ txId: t.id, reason: 'Same charge appears twice on the same day (do baar kata gaya?)' });
    seen.set(key, t);
    if (median > 0 && t.debit > median * 8 && t.debit > 20000) out.push({ txId: t.id, reason: 'Much larger than your usual debits' });
  }
  return out;
}

export function summarize(txs: Transaction[]) {
  const moneyIn = txs.reduce((s, t) => s + t.credit, 0);
  const moneyOut = txs.reduce((s, t) => s + t.debit, 0);
  const byCategory: Record<string, number> = {};
  for (const t of txs) if (t.debit > 0) byCategory[t.category] = (byCategory[t.category] ?? 0) + t.debit;
  const fees = txs.filter((t) => t.category === 'fee');
  return {
    moneyIn,
    moneyOut,
    byCategory,
    totalFees: fees.reduce((s, t) => s + t.debit, 0),
    feeLines: fees.map((t) => ({ tx: t, glossary: lookupFee(t.description) })),
  };
}

export const SAMPLE_CSV = `Date,Description,Debit,Credit,Balance
01/10/2026,Opening Balance,,,52000.00
01/10/2026,SALARY OCT 2026 ABC TRADERS,,85000.00,137000.00
02/10/2026,ATM CASH WITHDRAWAL MEEZAN F-7,5000.00,,132000.00
02/10/2026,OTHER BANK ATM FEE,23.40,,131976.60
04/10/2026,K-ELECTRIC BILL PAYMENT 0400012345678,6450.00,,125526.60
06/10/2026,RAAST TRANSFER TO AHMED ALI,15000.00,,110526.60
09/10/2026,POS PURCHASE IMTIAZ SUPERMARKET,8320.00,,102206.60
12/10/2026,ATM CASH WITHDRAWAL MEEZAN F-7,10000.00,,92206.60
15/10/2026,SMS ALERT CHARGES,150.00,,92056.60
15/10/2026,FED ON SMS ALERT,24.00,,92032.60
18/10/2026,IBFT FUNDS TRANSFER HBL 1234567890123,20000.00,,72032.60
21/10/2026,ATM CASH WITHDRAWAL MEEZAN DHA,5000.00,,67032.60
24/10/2026,ATM CASH WITHDRAWAL MEEZAN F-7,5000.00,,62032.60
28/10/2026,WHT U/S 236P ON CASH WITHDRAWAL,90.00,,61942.60
30/10/2026,PROFIT CREDIT,,312.55,62255.15
30/10/2026,DEBIT CARD ANNUAL FEE,2500.00,,59755.15
`;
