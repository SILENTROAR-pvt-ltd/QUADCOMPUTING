// CSV for the host's lead list. A cell that starts with = + - or @ is a formula in a spreadsheet, and guests type these
// values, so each such cell is prefixed with a quote to keep it plain text.
const cell = (v: unknown) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export interface LeadRow {
  guest_name: string; vibers_handle: string | null; email: string | null; phone: string | null;
  party_size: number; party_male: number; party_female: number; party_other: number;
  status: string; created_at: string;
}

export function leadsToCsv(rows: LeadRow[]): string {
  const head = ['Guest', 'Vibers ID', 'Email', 'Phone', 'Party size', 'Men', 'Women', 'Other', 'Status', 'Submitted'];
  const lines = rows.map((r) => [
    r.guest_name, r.vibers_handle, r.email, r.phone, r.party_size, r.party_male, r.party_female, r.party_other,
    r.status, r.created_at,
  ].map(cell).join(','));
  return [head.map(cell).join(','), ...lines].join('\r\n');
}
