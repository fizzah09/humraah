export interface ZakatInputs {
  cash: number;
  bank: number;
  goldGrams: number;
  goldKarat: number; // 24, 22, 21, 18
  silverGrams: number;
  businessStock: number;
  receivables: number;
  investments: number;
  liabilities: number;
}

export interface Prices {
  gold24PerGram: number; // PKR
  silverPerGram: number; // PKR
  source: string;
  timestamp: string;
}

export type NisabBasis = 'silver' | 'gold';

export const NISAB_GOLD_GRAMS = 87.48; // 7.5 tola
export const NISAB_SILVER_GRAMS = 612.36; // 52.5 tola
export const ZAKAT_RATE = 0.025;

export interface ZakatLine { label: string; value: number }

export interface ZakatResult {
  lines: ZakatLine[];
  totalAssets: number;
  liabilities: number;
  net: number;
  nisab: number;
  nisabBasis: NisabBasis;
  meetsNisab: boolean;
  zakatDue: number;
}

export function calculateZakat(i: ZakatInputs, p: Prices, basis: NisabBasis): ZakatResult {
  const goldValue = i.goldGrams * p.gold24PerGram * (i.goldKarat / 24);
  const silverValue = i.silverGrams * p.silverPerGram;
  const lines: ZakatLine[] = [
    { label: 'Cash (naqd raqam)', value: i.cash },
    { label: 'Bank balances', value: i.bank },
    { label: `Gold ${i.goldGrams}g @ ${i.goldKarat}K`, value: goldValue },
    { label: `Silver ${i.silverGrams}g`, value: silverValue },
    { label: 'Business stock (karobari maal)', value: i.businessStock },
    { label: 'Money owed to you (qarz wapas milna)', value: i.receivables },
    { label: 'Investments', value: i.investments },
  ];
  const totalAssets = lines.reduce((s, l) => s + Math.max(0, l.value || 0), 0);
  const liabilities = Math.max(0, i.liabilities || 0);
  const net = Math.max(0, totalAssets - liabilities);
  const nisab = basis === 'silver' ? NISAB_SILVER_GRAMS * p.silverPerGram : NISAB_GOLD_GRAMS * p.gold24PerGram;
  const meetsNisab = net > 0 && net >= nisab;
  return {
    lines,
    totalAssets,
    liabilities,
    net,
    nisab,
    nisabBasis: basis,
    meetsNisab,
    zakatDue: meetsNisab ? Math.round(net * ZAKAT_RATE * 100) / 100 : 0,
  };
}

/** Fallback prices (manual / last known). Shown with their timestamp; user can override. */
export const FALLBACK_PRICES: Prices = {
  gold24PerGram: 37500,
  silverPerGram: 420,
  source: 'Manual default (please update from today\'s market rate)',
  timestamp: '2026-10-31',
};
