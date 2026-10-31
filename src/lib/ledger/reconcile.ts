import type { LedgerEntry, Transaction } from '../types';
import { daysBetween } from '../format';

export interface Match {
  entryId: string;
  txId: string;
  reason: string;
  feeTxIds: string[];
}

export interface ReconcileResult {
  matches: Match[];
  unmatchedEntries: LedgerEntry[]; // logged but not found in statement
  unexplainedTx: Transaction[]; // cash debits with no ledger entry
  ambiguous: { entryId: string; candidateTxIds: string[] }[];
  totalCashOut: number;
  explained: number;
  percentExplained: number;
}

const MAX_DAYS = 2;

/** Ledger source -> compatible statement categories. */
const COMPATIBLE: Record<LedgerEntry['source'], Transaction['category'][]> = {
  atm: ['atm'],
  transfer: ['transfer'],
  cheque: ['transfer', 'other'],
  other: ['atm', 'transfer', 'other'],
};

const isCashLike = (t: Transaction) => t.debit > 0 && (t.category === 'atm' || t.category === 'transfer');

/**
 * Deterministic one-to-one matcher (PRD F3):
 * exact amount, date within ±2 days, compatible type. Closest date wins;
 * remaining exact ties are reported as ambiguous so the user decides.
 * ATM fee lines attach to the nearest preceding matched withdrawal.
 */
export function reconcile(
  entries: LedgerEntry[],
  txs: Transaction[],
  overrides: Record<string, string | null> = {},
): ReconcileResult {
  const used = new Set<string>();
  const matches: Match[] = [];
  const ambiguous: ReconcileResult['ambiguous'] = [];
  const unmatchedEntries: LedgerEntry[] = [];

  // Manual overrides first (entryId -> txId, or null = force unmatched)
  const remaining: LedgerEntry[] = [];
  for (const e of entries) {
    if (e.id in overrides) {
      const txId = overrides[e.id];
      if (txId && !used.has(txId) && txs.some((t) => t.id === txId)) {
        used.add(txId);
        matches.push({ entryId: e.id, txId, reason: 'Aap ne khud match kiya (manual override)', feeTxIds: [] });
      } else unmatchedEntries.push(e);
    } else remaining.push(e);
  }

  // Process entries in date order so earlier entries claim earlier debits.
  const sorted = [...remaining].sort((a, b) => a.date.localeCompare(b.date));
  for (const e of sorted) {
    const candidates = txs
      .filter((t) => !used.has(t.id) && t.debit === e.amount && COMPATIBLE[e.source].includes(t.category))
      .map((t) => ({ t, d: Math.abs(daysBetween(e.date, t.date)) }))
      .filter((c) => c.d <= MAX_DAYS)
      .sort((a, b) => a.d - b.d || a.t.date.localeCompare(b.t.date));

    if (candidates.length === 0) {
      unmatchedEntries.push(e);
      continue;
    }
    const best = candidates[0];
    const tied = candidates.filter((c) => c.d === best.d);
    // Same-day duplicates are only ambiguous if another *unprocessed* entry can't take the other one.
    const sameAmountEntriesLeft = sorted.filter(
      (o) => o !== e && o.amount === e.amount && !matches.some((m) => m.entryId === o.id),
    ).length;
    if (tied.length > 1 && sameAmountEntriesLeft === 0) {
      ambiguous.push({ entryId: e.id, candidateTxIds: tied.map((c) => c.t.id) });
    }
    used.add(best.t.id);
    matches.push({
      entryId: e.id,
      txId: best.t.id,
      reason: `Same amount, ${best.d === 0 ? 'same day' : `${best.d} din ka farq`}, type ${best.t.category.toUpperCase()}`,
      feeTxIds: [],
    });
  }

  // Attach ATM fee lines to their withdrawal (same or next day).
  const feeLines = txs.filter((t) => t.category === 'fee' && /atm|withdraw|cash/i.test(t.description));
  for (const f of feeLines) {
    const host = matches
      .map((m) => ({ m, t: txs.find((t) => t.id === m.txId)! }))
      .filter(({ t }) => t.category === 'atm' && daysBetween(t.date, f.date) >= 0 && daysBetween(t.date, f.date) <= 1)
      .sort((a, b) => daysBetween(a.t.date, f.date) - daysBetween(b.t.date, f.date))[0];
    if (host) host.m.feeTxIds.push(f.id);
  }

  const cashTx = txs.filter(isCashLike);
  const matchedTx = new Set(matches.map((m) => m.txId));
  const unexplainedTx = cashTx.filter((t) => !matchedTx.has(t.id));
  const totalCashOut = cashTx.reduce((s, t) => s + t.debit, 0);
  const explained = cashTx.filter((t) => matchedTx.has(t.id)).reduce((s, t) => s + t.debit, 0);

  return {
    matches,
    unmatchedEntries,
    unexplainedTx,
    ambiguous,
    totalCashOut,
    explained,
    percentExplained: totalCashOut ? Math.round((explained / totalCashOut) * 100) : 0,
  };
}
