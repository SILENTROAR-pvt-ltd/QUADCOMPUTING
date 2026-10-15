/** A 6-digit PIN anyone would try first: one digit repeated, or a straight run up or down. */
export function isWeakPin(pin: string): boolean {
  if (!/^\d{6}$/.test(pin)) return false;
  if (/^(\d)\1{5}$/.test(pin)) return true;
  const up = '01234567890123456789';
  const down = '98765432109876543210';
  return up.includes(pin) || down.includes(pin);
}

export const WEAK_PIN_MESSAGE = 'That PIN is too easy to guess. Avoid repeats like 111111 and runs like 123456.';
