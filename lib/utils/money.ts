export function formatMinorUnits(amountMinor: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amountMinor / 100);
}
