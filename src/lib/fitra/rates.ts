/**
 * Sadaqat-ul-Fitr (Fitrana) and Fidya rates, Ramazan 1447 AH / 2026.
 * Announced by the Council of Islamic Ideology (CII), Chairman Dr Raghib Hussain Naeemi, 9 Feb 2026.
 * Read from press reports of the announcement (the CII notification itself was not available online):
 *  - https://english.aaj.tv/news/amp/330452254
 *  - https://en.dailypakistan.com.pk/09-Feb-2026/pakistan-announces-fitrana-fidyah-amounts-for-ramadan-2026
 * Rates change every year: update this file each Ramazan.
 */
export interface FitraOption { id: string; label: string; ur: string; perPerson: number; fidya30: number }

export const FITRA_YEAR = '2026 (1447 AH)';
export const FITRA_SOURCE = {
  by: 'Council of Islamic Ideology (CII), Pakistan',
  announced: '2026-02-09',
  links: [
    'https://english.aaj.tv/news/amp/330452254',
    'https://en.dailypakistan.com.pk/09-Feb-2026/pakistan-announces-fitrana-fidyah-amounts-for-ramadan-2026',
  ],
  note: 'Press reports: CII ki notification online nahi mili. Reports mein kam az kam fitra Rs 300 hai, aur sarkari aata ke hisaab se Rs 200 bhi likha hai.',
};

export const FITRA_OPTIONS: FitraOption[] = [
  { id: 'wheat', label: 'Gandum (kam az kam)', ur: 'گندم', perPerson: 300, fidya30: 9000 },
  { id: 'barley', label: 'Jau (barley)', ur: 'جو', perPerson: 1100, fidya30: 33000 },
  { id: 'dates', label: 'Khajoor', ur: 'کھجور', perPerson: 1600, fidya30: 48000 },
  { id: 'raisins', label: 'Kishmish', ur: 'کشمش', perPerson: 3800, fidya30: 114000 },
  { id: 'munaqqa', label: 'Munaqqa', ur: 'منقیٰ', perPerson: 5400, fidya30: 162000 },
];

export interface FitraResult { people: number; perPerson: number; total: number; working: string }

export function calculateFitra(people: number, perPerson: number): FitraResult {
  const n = Math.max(0, Math.floor(people));
  const total = n * perPerson;
  return { people: n, perPerson, total, working: `${n} afraad × Rs ${perPerson} = Rs ${total}` };
}

/** Fidya per missed fast = 30-day amount / 30. */
export function calculateFidya(days: number, opt: FitraOption) {
  const perDay = opt.fidya30 / 30;
  const d = Math.max(0, Math.floor(days));
  return { perDay, days: d, total: d * perDay, working: `${d} roze × Rs ${perDay} = Rs ${d * perDay}` };
}
