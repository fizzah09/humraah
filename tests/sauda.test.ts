import { describe, expect, it } from 'vitest';
import { applyRates, changeBack, lineAmount, parseLine, parseList, total } from '@/lib/sauda/parse';

describe('sauda parser', () => {
  it('reads qty, unit and price', () => {
    const i = parseLine('2 kg cheeni 300');
    expect(i).toMatchObject({ name: 'cheeni', qty: 2, unit: 'kg', price: 300, problem: null });
  });
  it('reads a rate with @', () => {
    const i = parseLine('doodh 1 litre @ 220');
    expect(i).toMatchObject({ name: 'doodh', qty: 1, unit: 'litre', rate: 220, problem: null });
    expect(lineAmount(i)!.amount).toBe(220);
  });
  it('handles Roman Urdu quantities', () => {
    expect(parseLine('aadha kilo dahi')).toMatchObject({ name: 'dahi', qty: 0.5, unit: 'kg', problem: 'no_price' });
    expect(parseLine('ek darjan anday')).toMatchObject({ name: 'anday', qty: 1, unit: 'dozen' });
    expect(parseLine('pao tamatar')).toMatchObject({ name: 'tamatar', qty: 0.25, unit: 'kg' });
  });
  it('converts grams to kg in the working', () => {
    const i = { ...parseLine('500g daal'), rate: 400, problem: null };
    const l = lineAmount(i)!;
    expect(l.amount).toBe(200);
    expect(l.working).toContain('0.5 kg');
  });
  it('flags unreadable OCR lines and asks', () => {
    expect(parseLine('~~ 1 ..').problem).toBe('unreadable');
    expect(parseLine('aata').problem).toBe('no_qty');
  });
  it('uses remembered rates and totals', () => {
    const items = applyRates(parseList('2 kg aata\n1 litre doodh\nnamak 60'), { aata: 150, doodh: 220 });
    const t = total(items);
    expect(t.pending).toHaveLength(0);
    expect(t.sum).toBe(300 + 220 + 60);
  });
  it('gives change back by notes', () => {
    expect(changeBack(1000, 580)).toEqual({ change: 420, notes: [{ note: 100, count: 4 }, { note: 20, count: 1 }] });
  });
});

import { calculateFidya, calculateFitra, FITRA_OPTIONS } from '@/lib/fitra/rates';
describe('fitra', () => {
  it('multiplies people by the per-person rate', () => {
    expect(calculateFitra(5, 300)).toMatchObject({ total: 1500, working: '5 afraad × Rs 300 = Rs 1500' });
    expect(calculateFitra(0, 300).total).toBe(0);
  });
  it('fidya per day is the 30-day amount / 30', () => {
    expect(calculateFidya(10, FITRA_OPTIONS[0]).total).toBe(3000);
  });
});
