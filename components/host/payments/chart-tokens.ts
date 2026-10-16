// Chart colors by role (validated with the dataviz palette check on the white card surface: all gates pass; the
// lighter slots need visible labels, which every chart here carries). Text never wears a series color.
export const SERIES = {
  youEarn: '#2a78d6', // categorical slot 1: the venue's revenue
  weEarn: '#eb6834', // categorical slot 2: the platform fee
} as const;

/** ₹980, ₹1.2k, ₹45k, ₹1.3L: short enough for an axis tick. Tooltips show the full amount. */
export function compactRupees(n: number): string {
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(n >= 1e6 ? 0 : 1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k`;
  return `₹${Math.round(n)}`;
}

export const CHROME = {
  grid: '#e1e0d9',
  baseline: '#c3c2b7',
  muted: '#898781',
  textPrimary: '#0b0b0b',
  textSecondary: '#52514e',
  surface: '#ffffff',
} as const;
