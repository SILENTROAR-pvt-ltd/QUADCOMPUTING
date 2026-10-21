// How a guest in a room reaches the desk from their phone: one number, by a call or on WhatsApp. Stored with the stay
// policies (businesses.stay_policies.front_desk) and read by the room page.

export interface FrontDesk { phone: string | null; mode: 'call' | 'whatsapp' }

export const NO_FRONT_DESK: FrontDesk = { phone: null, mode: 'call' };

/** The desk's number as stored: digits only, 10 (India) to 15 (with a country code). Anything else is no number. */
export function readFrontDesk(raw: unknown): FrontDesk {
  const src: any = raw && typeof raw === 'object' ? raw : {};
  const digits = String(src.phone ?? '').replace(/\D/g, '');
  return { phone: digits.length >= 10 && digits.length <= 15 ? digits : null, mode: src.mode === 'whatsapp' ? 'whatsapp' : 'call' };
}

/** For saving: a number the owner typed that is not a usable one is an error they see, not silently dropped. */
export function frontDeskError(raw: unknown): string | null {
  const typed = String((raw as any)?.phone ?? '').replace(/\D/g, '');
  return typed && !readFrontDesk(raw).phone ? 'The front desk number needs 10 digits, or up to 15 with a country code.' : null;
}
