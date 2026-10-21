// What a bill line is, for the reports: a room night, a room add-on, an early or late check-out fee, the advance a
// stay was paid in (or its credit on the final invoice), or a dish. Stay lines are written by the stays services with
// a `type` (stay-folio.util.ts, stay-ledger.ts, stay-pass.service.ts, room-payment.service.ts); older stay bills are
// known by their line ids and the bill's order_type.

export const STAY_CATEGORY = {
  rooms: 'Rooms & stays',
  addons: 'Room add-ons',
  extras: 'Early check-in & late check-out',
} as const;
export type StaySegment = keyof typeof STAY_CATEGORY;

const STAY_ORDER_TYPES = new Set(['room_stay', 'room_advance']);

/** The stay segment a line says it belongs to, or null: a dish on a stay invoice names no type. */
export function staySegmentOf(line: any): StaySegment | null {
  const type = String(line?.type ?? '').toLowerCase();
  if (type === 'room_tariff' || type === 'advance') return 'rooms';
  if (type === 'addon') return 'addons';
  if (type === 'early_checkin' || type === 'late_checkout') return 'extras';
  const id = String(line?.id ?? '').toLowerCase();
  if (/^tariff-/.test(id) || id === 'advance-paid' || /^payment-\d+$/.test(id)) return 'rooms';
  if (/^(early_checkin|late_checkout)-/.test(id)) return 'extras';
  if (String(line?.section ?? '').toUpperCase() === 'ACCOMMODATION') return 'rooms';
  if (String(line?.section ?? '').toUpperCase() === 'ADD_ON') return 'addons';
  return null;
}

/** An advance bill's only line is the room payment, whatever it is called (older builds wrote it without a type). */
export const isAdvanceBill = (orderType: unknown) => String(orderType ?? '').toLowerCase() === 'room_advance';

/** True for a stay's own bill (the advance, or the invoice at checkout), as opposed to a dining or counter bill. */
export const isStayBill = (order: { order_type?: unknown }) => STAY_ORDER_TYPES.has(String(order?.order_type ?? '').toLowerCase());

/** Nights on a stay bill: the tariff line's quantity. */
export function nightsOnBill(lines: any[]): number {
  return lines.reduce((n, l) => (String(l?.type ?? '').toLowerCase() === 'room_tariff' || /^tariff-/.test(String(l?.id ?? '')) ? n + (Number(l?.qty ?? l?.quantity) || 1) : n), 0);
}
