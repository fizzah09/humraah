import type { LedgerSource, Purpose } from '../types';
export const PURPOSES: { id: Purpose; label: string; emoji: string }[] = [
  { id: 'groceries', label: 'Rashan', emoji: '🛒' },
  { id: 'school', label: 'School fee', emoji: '🎒' },
  { id: 'rent', label: 'Kiraya', emoji: '🏠' },
  { id: 'family', label: 'Ghar walay', emoji: '👪' },
  { id: 'medical', label: 'Dawai', emoji: '💊' },
  { id: 'bills', label: 'Bills', emoji: '🧾' },
  { id: 'gift', label: 'Tohfa', emoji: '🎁' },
  { id: 'other', label: 'Other', emoji: '•' },
];
export const SOURCES: { id: LedgerSource; label: string }[] = [
  { id: 'atm', label: 'ATM' },
  { id: 'transfer', label: 'App transfer' },
  { id: 'cheque', label: 'Cheque' },
  { id: 'other', label: 'Other' },
];
export const purposeLabel = (p: Purpose) => PURPOSES.find((x) => x.id === p)!;
