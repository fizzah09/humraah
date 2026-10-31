import { describe, expect, it } from 'vitest';
import { reconcile } from '@/lib/ledger/reconcile';
import type { LedgerEntry, Transaction } from '@/lib/types';

const tx = (id: string, date: string, debit: number, category: Transaction['category'] = 'atm', description = 'ATM CASH WITHDRAWAL'): Transaction => ({ id, date, description, debit, credit: 0, category });
const en = (id: string, date: string, amount: number, source: LedgerEntry['source'] = 'atm'): LedgerEntry => ({ id, date, amount, source, purpose: 'groceries' });

describe('reconcile', () => {
  it('matches exact amount within ±2 days and compatible type', () => {
    const r = reconcile([en('e1', '2026-10-01', 5000)], [tx('t1', '2026-10-03', 5000)]);
    expect(r.matches).toHaveLength(1);
    expect(r.matches[0].txId).toBe('t1');
  });

  it('does not match beyond 2 days or wrong type', () => {
    const r = reconcile([en('e1', '2026-10-01', 5000), en('e2', '2026-10-10', 7000)], [tx('t1', '2026-10-04', 5000), tx('t2', '2026-10-10', 7000, 'bill')]);
    expect(r.matches).toHaveLength(0);
    expect(r.unmatchedEntries).toHaveLength(2);
  });

  it('two same-amount withdrawals on one day map one-to-one', () => {
    const r = reconcile(
      [en('e1', '2026-10-05', 5000), en('e2', '2026-10-05', 5000)],
      [tx('t1', '2026-10-05', 5000), tx('t2', '2026-10-05', 5000)],
    );
    expect(r.matches.map((m) => m.txId).sort()).toEqual(['t1', 't2']);
    expect(r.ambiguous).toHaveLength(0);
  });

  it('flags ambiguity when one entry could match two debits', () => {
    const r = reconcile([en('e1', '2026-10-05', 5000)], [tx('t1', '2026-10-05', 5000), tx('t2', '2026-10-05', 5000)]);
    expect(r.ambiguous).toHaveLength(1);
    expect(r.unexplainedTx).toHaveLength(1);
  });

  it('handles a withdrawal near midnight (posted next day)', () => {
    const r = reconcile([en('e1', '2026-10-31T23:55:00', 3000)], [tx('t1', '2026-11-01', 3000)]);
    expect(r.matches).toHaveLength(1);
  });

  it('prefers the closest date', () => {
    const r = reconcile([en('e1', '2026-10-05', 5000)], [tx('t1', '2026-10-03', 5000), tx('t2', '2026-10-06', 5000)]);
    expect(r.matches[0].txId).toBe('t2');
  });

  it('attaches ATM fee lines to their withdrawal and excludes them from cash totals', () => {
    const r = reconcile([en('e1', '2026-10-02', 5000)], [tx('t1', '2026-10-02', 5000), tx('f1', '2026-10-02', 23.4, 'fee', 'OTHER BANK ATM FEE')]);
    expect(r.matches[0].feeTxIds).toEqual(['f1']);
    expect(r.totalCashOut).toBe(5000);
    expect(r.percentExplained).toBe(100);
  });

  it('respects manual overrides', () => {
    const r = reconcile([en('e1', '2026-10-02', 5000)], [tx('t1', '2026-10-02', 5000)], { e1: null });
    expect(r.matches).toHaveLength(0);
    const r2 = reconcile([en('e1', '2026-10-20', 4000)], [tx('t1', '2026-10-02', 5000)], { e1: 't1' });
    expect(r2.matches[0].txId).toBe('t1');
  });

  it('computes percent explained', () => {
    const r = reconcile([en('e1', '2026-10-02', 5000)], [tx('t1', '2026-10-02', 5000), tx('t2', '2026-10-09', 15000, 'transfer')]);
    expect(r.percentExplained).toBe(25);
    expect(r.unexplainedTx.map((t) => t.id)).toEqual(['t2']);
  });
});
