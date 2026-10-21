// The one button a guest in a room has to reach the desk: a call, or a WhatsApp chat that opens with the room filled in.

export interface FrontDeskContact { phone: string | null; mode: 'call' | 'whatsapp' }

/** Digits with the country code: a 10-digit Indian mobile gets 91 in front; anything longer is taken as already having one. */
export const withCountryCode = (digits: string) => (digits.length === 10 ? `91${digits}` : digits);

/** Where the button goes, or null when the venue has not set a number. */
export function frontDeskHref(contact: FrontDeskContact | null | undefined, roomNumber: string, venueName: string): string | null {
  const digits = String(contact?.phone || '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  const full = withCountryCode(digits);
  if (contact?.mode === 'whatsapp') {
    const text = `Hello ${venueName}, this is Room ${roomNumber}. `;
    return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
  }
  return `tel:+${full}`;
}
