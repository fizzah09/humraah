import type { TxCategory } from '../types';
export const CATEGORY_LABEL: Record<TxCategory, string> = {
  atm: 'ATM withdrawal',
  card: 'Card / online purchase',
  transfer: 'Transfer (IBFT / Raast)',
  bill: 'Bill payment',
  fee: 'Fees & taxes',
  profit: 'Profit',
  income: 'Salary / income',
  other: 'Other',
};
