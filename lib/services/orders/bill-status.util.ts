// A bill saved at the till is charged its per-bill platform fee the moment it is closed, whichever closed word the
// client used. SETTLED, COMPLETED and SERVED are what the till sends; PAID, BILLED and CLOSED are accepted by the
// reports as closed too (session-entry.util.ts), so a bill saved under them is a closed bill and pays the same fee.
// CANCELLED is closed but never a sale: no fee.
const FEE_BEARING = new Set(['SETTLED', 'COMPLETED', 'SERVED', 'PAID', 'BILLED', 'CLOSED']);

export const isFeeBearingStatus = (status: unknown): boolean => FEE_BEARING.has(String(status || '').toUpperCase());
