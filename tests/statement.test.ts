import { describe, expect, it } from 'vitest';
import { parseCsv, SAMPLE_CSV, summarize } from '@/lib/statements/parse';
import { extractBill } from '@/lib/bills/extract';
import { parseAmount } from '@/lib/ledger/quickparse';
import { playbookEngine } from '@/lib/assistant/engine';

describe('statement parser', () => {
  it('parses sample with integrity ok and masks account numbers', () => {
    const p = parseCsv(SAMPLE_CSV);
    expect(p.transactions.length).toBe(15);
    expect(p.integrityOk).toBe(true);
    expect(p.transactions.some((t) => /1234567890123/.test(t.description))).toBe(false);
    expect(summarize(p.transactions).totalFees).toBeCloseTo(2787.4, 1);
  });
  it('flags a broken balance', () => {
    const p = parseCsv(SAMPLE_CSV.replace('132000.00', '131000.00'));
    expect(p.integrityOk).toBe(false);
    expect(p.suspectRowIds.length).toBeGreaterThan(0);
  });
});

describe('bill extraction validator', () => {
  it('extracts amount, due date and masks consumer number', () => {
    const d = extractBill('K-ELECTRIC\nConsumer No 0400012345678\nDue Date 15-Nov-2026\nPayable Within Due Date 6,450');
    expect(d.billerType).toMatch(/Electricity/);
    expect(d.amount).toBe(6450);
    expect(d.dueDate).toBe('2026-11-15');
    expect(d.consumerMasked).toBe('•••• 5678');
  });
});

describe('quick amount parser', () => {
  it.each([['paanch hazaar ghar ka rashan', 5000], ['5k', 5000], ['dedh lakh', 150000], ['Rs 2,500', 2500], ['do sau', 200]])('%s', (s, n) => {
    expect(parseAmount(s)).toBe(n);
  });
});

describe('assistant playbook engine', () => {
  const st = { task: null, bank: null, stepIndex: 0 };
  it('asks for a screenshot after task + bank', () => {
    const r = playbookEngine({ message: 'Meezan Bank se paise bhejne hain', state: st, history: [] });
    expect(r.state.task).toBe('send_money');
    expect(r.step.next_instruction_roman).toMatch(/screenshot/i);
  });
  it('detects screen from OCR and adds checkpoint on money step', () => {
    const r = playbookEngine({ message: '', image: 'data:image/png;base64,AAA', ocrText: 'Review\nBeneficiary Name\nAmount\nConfirm', state: { task: 'send_money', bank: 'Meezan Bank', stepIndex: 2 }, history: [] });
    expect(r.step.target_label).toBe('Confirm');
    expect(r.step.is_money_step).toBe(true);
  });
  it('refuses OTP in message', () => {
    const r = playbookEngine({ message: 'mera OTP 482913 hai', state: st, history: [] });
    expect(r.step.next_instruction_roman).toMatch(/PIN, OTP/);
  });
});
