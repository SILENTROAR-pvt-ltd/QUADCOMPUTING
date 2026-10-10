const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(val: unknown): val is string {
  return typeof val === 'string' && UUID_REGEX.test(val);
}

export function sanitizeUuid(val: unknown): string | null {
  return isUuid(val) ? val : null;
}

export function normalizePaymentMethod(method: unknown): 'UPI' | 'CASH' | 'CARD' {
  const upper = String(method || '').toUpperCase();
  if (upper === 'CASH') return 'CASH';
  if (upper === 'CARD') return 'CARD';
  return 'UPI';
}
