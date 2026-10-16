import { todayIst } from './venue-hours.service';

export interface ReservationInput {
  guestName: string;
  guestPhone: string;
  partySize: number;
  reservedDate: string;
  reservedTime: string;
  /** A specific table the guest chose, or null to let the venue assign the smallest free table that fits. */
  tableId?: string | null;
  notes?: string;
}

export type ReservationStatus = 'requested' | 'confirmed' | 'seated' | 'cancelled' | 'no_show';
const ACTIVE: ReservationStatus[] = ['requested', 'confirmed', 'seated'];

export interface Reservation {
  id: string;
  businessId: string;
  tableNumber: string;
  guestName: string;
  guestPhone: string;
  partySize: number;
  reservedDate: string;
  reservedTime: string;
  status: ReservationStatus;
  notes: string;
  createdAt: string;
}

export interface TableOption {
  id: string;
  label: string;
  seats: number;
  free: boolean;
}

const PHONE_RE = /^\+?[0-9\s-]{7,15}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

const MESSAGES: Record<string, string> = {
  RESERVATIONS_OFF: 'Reservations are not open at this venue.',
  TABLE_NOT_FOUND: 'That table is no longer available. Pick another.',
  TABLE_TOO_SMALL: 'That table is too small for your party.',
  TABLE_TAKEN: 'That table was just booked for this time. Pick another.',
  SLOT_FULL: 'No table is free at this time. Try another time.',
};

export class ReservationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

export function validateReservationInput(input: ReservationInput): string | null {
  if (!input.guestName.trim()) return 'Name is required.';
  if (!PHONE_RE.test(input.guestPhone.trim())) return 'Enter a valid phone number.';
  if (!Number.isInteger(input.partySize) || input.partySize < 1 || input.partySize > 20) return 'Party size must be 1 to 20.';
  if (!DATE_RE.test(input.reservedDate)) return 'Invalid date.';
  if (!TIME_RE.test(input.reservedTime)) return 'Invalid time slot.';
  if (input.reservedDate < todayIst()) return 'Date must be today or in the future.';
  return null;
}

export async function createReservation(db: any, businessId: string, input: ReservationInput): Promise<Reservation> {
  const err = validateReservationInput(input);
  if (err) throw new ReservationError('INVALID', err);

  const { data, error } = await db.rpc('create_reservation_atomic', {
    p_business_id: businessId,
    p_guest_name: input.guestName.trim(),
    p_guest_phone: input.guestPhone.trim(),
    p_party_size: input.partySize,
    p_date: input.reservedDate,
    p_time: `${input.reservedTime}:00`,
    p_table_id: input.tableId ?? null,
    p_notes: input.notes?.trim() || null,
  });
  if (error) {
    const code = Object.keys(MESSAGES).find((c) => String(error.message).includes(c));
    throw new ReservationError(code ?? 'FAILED', code ? MESSAGES[code] : 'Could not book. Please try again.');
  }
  return mapRow(data);
}

/** Every active table at the venue, marked free or taken for one slot, with whether it seats the party. */
export async function listTablesForSlot(db: any, businessId: string, date: string, time: string): Promise<TableOption[]> {
  const [{ data: tables }, { data: booked }] = await Promise.all([
    db.from('restaurant_tables').select('id, table_number, seating_capacity').eq('business_id', businessId).eq('is_active', true).order('seating_capacity').order('table_number'),
    db.from('venue_reservations').select('table_id').eq('business_id', businessId).eq('reserved_date', date).eq('reserved_time', `${time}:00`).in('status', ACTIVE),
  ]);
  const taken = new Set((booked ?? []).map((r: any) => r.table_id));
  return (tables ?? []).map((t: any) => ({
    id: t.id,
    label: t.table_number,
    seats: t.seating_capacity,
    free: !taken.has(t.id),
  }));
}

export async function listReservations(db: any, businessId: string, filter: 'upcoming' | 'all' = 'upcoming'): Promise<Reservation[]> {
  let q = db.from('venue_reservations').select('*').eq('business_id', businessId).order('reserved_date').order('reserved_time');
  if (filter === 'upcoming') q = q.gte('reserved_date', todayIst()).in('status', ['requested', 'confirmed', 'seated']);
  const { data } = await q.limit(300);
  return (data ?? []).map(mapRow);
}

export async function updateReservationStatus(db: any, id: string, businessId: string, status: ReservationStatus): Promise<void> {
  const { error } = await db.from('venue_reservations').update({ status }).eq('id', id).eq('business_id', businessId);
  if (error) throw new Error(error.message);
}

function mapRow(r: any): Reservation {
  return {
    id: r.id,
    businessId: r.business_id,
    tableNumber: r.table_number,
    guestName: r.guest_name,
    guestPhone: r.guest_phone,
    partySize: r.party_size,
    reservedDate: r.reserved_date,
    reservedTime: String(r.reserved_time ?? '').slice(0, 5),
    status: r.status,
    notes: r.notes ?? '',
    createdAt: r.created_at,
  };
}
