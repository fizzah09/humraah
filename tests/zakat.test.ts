import { describe, expect, it } from 'vitest';
import { calculateZakat, NISAB_SILVER_GRAMS, type Prices, type ZakatInputs } from '@/lib/zakat/calc';

const P: Prices = { gold24PerGram: 20000, silverPerGram: 200, source: 'test', timestamp: 'now' };
const zero: ZakatInputs = { cash: 0, bank: 0, goldGrams: 0, goldKarat: 24, silverGrams: 0, businessStock: 0, receivables: 0, investments: 0, liabilities: 0 };
const nisab = NISAB_SILVER_GRAMS * 200;

describe('zakat', () => {
  it('zero assets -> no zakat', () => {
    const r = calculateZakat(zero, P, 'silver');
    expect(r.zakatDue).toBe(0);
    expect(r.meetsNisab).toBe(false);
  });
  it('exactly at nisab -> zakat due', () => {
    const r = calculateZakat({ ...zero, cash: nisab }, P, 'silver');
    expect(r.meetsNisab).toBe(true);
    expect(r.zakatDue).toBeCloseTo(nisab * 0.025, 2);
  });
  it('just below nisab -> none', () => {
    expect(calculateZakat({ ...zero, cash: nisab - 1 }, P, 'silver').zakatDue).toBe(0);
  });
  it('subtracts liabilities and values gold by karat', () => {
    const r = calculateZakat({ ...zero, goldGrams: 100, goldKarat: 18, liabilities: 100000 }, P, 'gold');
    expect(r.totalAssets).toBe(1_500_000);
    expect(r.net).toBe(1_400_000);
    expect(r.meetsNisab).toBe(false); // gold nisab = 87.48 * 20000 = 1,749,600
  });
  it('liabilities larger than assets -> net 0', () => {
    expect(calculateZakat({ ...zero, cash: 100, liabilities: 1000 }, P, 'silver').net).toBe(0);
  });
});
