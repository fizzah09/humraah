export type LedgerSource = 'atm' | 'transfer' | 'cheque' | 'other';

export type Purpose =
  | 'groceries' | 'school' | 'rent' | 'family' | 'medical' | 'bills' | 'gift' | 'other';

export interface LedgerEntry {
  id: string;
  amount: number;
  date: string; // ISO yyyy-mm-dd or full ISO
  source: LedgerSource;
  purpose: Purpose;
  note?: string;
}

export type TxCategory =
  | 'atm' | 'card' | 'transfer' | 'bill' | 'fee' | 'profit' | 'income' | 'other';

export interface Transaction {
  id: string;
  date: string; // yyyy-mm-dd
  description: string;
  debit: number;
  credit: number;
  balance?: number;
  category: TxCategory;
}

export interface Bill {
  id: string;
  billerType: string;
  amount: number;
  dueDate: string; // yyyy-mm-dd
  status: 'due' | 'paid';
  recurring: boolean;
  consumerMasked?: string;
  followers: string[];
}

export type Lang = 'ur' | 'roman';
