// Spreadsheet-safe CSV for guest exports.
// - Fields containing a comma, quote or line break are quoted, with quotes doubled.
// - Text that starts with a formula character (= + - @ tab CR) is prefixed with an apostrophe
//   so a spreadsheet shows it instead of running it.
// - Numbers, including negative amounts such as "-14.00", are written as they are.

const NUMBER = /^-?\d+(\.\d+)?$/;

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  let s = String(value);
  if (!NUMBER.test(s) && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvDocument(header: string[], rows: unknown[][]): string {
  const lines = [header.map(csvCell).join(',')];
  for (const row of rows) lines.push(row.map(csvCell).join(','));
  return lines.join('\r\n') + '\r\n';
}
