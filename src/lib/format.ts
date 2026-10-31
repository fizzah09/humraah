export const rs = (n: number) =>
  'Rs. ' + Math.round(n).toLocaleString('en-PK');

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** Mask long digit runs (account / card / CNIC / phone numbers, 10+ digits) to the last 4 digits. Dates stay readable. */
export function maskDigits(text: string): string {
  return text.replace(/\d[\d\s-]{8,}\d/g, (m) => {
    const digits = m.replace(/\D/g, '');
    return digits.length >= 10 ? '•••• ' + digits.slice(-4) : m;
  });
}

export const today = () => new Date().toISOString().slice(0, 10);

export function daysBetween(a: string, b: string): number {
  const da = new Date(a.slice(0, 10) + 'T00:00:00Z').getTime();
  const db = new Date(b.slice(0, 10) + 'T00:00:00Z').getTime();
  return Math.round((db - da) / 86400000);
}
