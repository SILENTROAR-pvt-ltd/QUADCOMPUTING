import { randomInt } from 'node:crypto';

// The code a guest keeps for an advance booking: short enough to read out at the desk, with no look-alike letters.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function newConfirmationCode(): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `ST-${s}`;
}

export const isConfirmationCode = (v: unknown): v is string => typeof v === 'string' && /^ST-[A-HJ-NP-Z2-9]{6}$/.test(v);

export const normalizeConfirmationCode = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim().toUpperCase().replace(/^ST-?/, 'ST-') : '';
  return isConfirmationCode(s) ? s : null;
};
