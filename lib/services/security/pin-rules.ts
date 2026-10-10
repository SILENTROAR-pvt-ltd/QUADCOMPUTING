// PIN rules shared by the browser (to explain a problem as the PIN is typed) and the server.

/** Why a new PIN is not acceptable, or null. */
export function pinProblem(pin: unknown): string | null {
  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) return 'A PIN is exactly 4 digits.';
  if (/^(\d)\1{3}$/.test(pin)) return 'Avoid one digit repeated (like 1111); it is the first thing anyone tries.';
  if ('0123456789'.includes(pin) || '9876543210'.includes(pin)) return 'Avoid a run of digits like 1234; it is too easy to guess.';
  return null;
}
