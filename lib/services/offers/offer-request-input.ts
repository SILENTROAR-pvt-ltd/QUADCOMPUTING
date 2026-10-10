// What a guest may send about a live offer: redeem it, or ask the host a question. Plain text only.
import { randomInt } from 'node:crypto';

export type OfferRequestKind = 'redeem' | 'inquiry';

export interface OfferRequestInput {
  offerId: string;
  kind: OfferRequestKind;
  message: string | null;
  guestName: string | null;
  table: string | null;
}

export type OfferRequestCheck = { ok: true; value: OfferRequestInput } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// No 0, O, 1 or I: a code is read out loud and typed by hand at the counter.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function makeRedeemCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

const plain = (raw: unknown, max: number) => String(raw ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

export function cleanOfferRequest(body: any): OfferRequestCheck {
  const offerId = String(body?.offer_id ?? '');
  if (!UUID.test(offerId)) return { ok: false, error: 'Choose an offer.' };

  const kind = String(body?.kind ?? '');
  if (kind !== 'redeem' && kind !== 'inquiry') return { ok: false, error: 'Choose redeem or ask a question.' };

  const message = plain(body?.message, 300) || null;
  if (kind === 'inquiry' && !message) return { ok: false, error: 'Write your question first.' };

  return {
    ok: true,
    value: {
      offerId,
      kind,
      message: kind === 'inquiry' ? message : null,
      guestName: plain(body?.guest_name, 60) || null,
      table: plain(body?.table_number, 12) || null,
    },
  };
}
