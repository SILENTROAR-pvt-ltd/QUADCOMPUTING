// Guest columns on `rooms`: what a check-in writes and what releasing the room clears.

const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

export const CLEARED_GUEST_FIELDS = {
  guest_name: null,
  guest_phone: null,
  guest_id_proof: null,
  id_type: null,
  id_number: null,
  guest_email: null,
  guest_address: null,
  current_guest_id: null,
  total_guests: 1,
  purpose_of_visit: null,
  is_celebration: false,
  celebration_type: null,
  celebration_note: null,
  selected_addons: [],
  // Self check-in leaves these (migration 20261021000005); the next guest must never inherit an ID photo.
  id_proof_path: null,
  id_verified_at: null,
  checkin_source: 'desk',
} as const;

export interface CheckInBody {
  guest_name?: string; guest_phone?: string; guest_id?: string; guest_id_proof?: string;
  id_type?: string; id_number?: string; guest_email?: string; guest_address?: string;
  check_in_time?: string; check_out_time?: string | null; total_guests?: number | string;
  purpose_of_visit?: string; is_celebration?: boolean; celebration_type?: string; celebration_note?: string;
  selected_addons?: unknown[];
}

/** Why a check-in request cannot be accepted, or null. */
export function checkInError(body: CheckInBody): string | null {
  if (!text(body.guest_name) || !text(body.guest_phone)) return 'Guest name and phone are required.';
  const inAt = Date.parse(String(body.check_in_time || ''));
  const outAt = Date.parse(String(body.check_out_time || ''));
  if (!Number.isNaN(inAt) && !Number.isNaN(outAt) && outAt <= inAt) return 'Expected check-out must be after check-in.';
  return null;
}

/** The room columns a check-in sets, from the front desk form. */
export function checkInFields(body: CheckInBody, nowIso = new Date().toISOString()) {
  const idType = text(body.id_type);
  const idNumber = text(body.id_number);
  const checkIn = text(body.check_in_time) || nowIso;
  const checkOut = text(body.check_out_time);
  return {
    status: 'OCCUPIED' as const,
    guest_name: text(body.guest_name) || 'Guest',
    guest_phone: text(body.guest_phone),
    id_type: idType,
    id_number: idNumber,
    guest_email: text(body.guest_email),
    guest_address: text(body.guest_address),
    guest_id_proof: text(body.guest_id_proof) || (idNumber ? `${idType || 'ID'}: ${idNumber}` : null),
    current_guest_id: text(body.guest_id),
    check_in_date: checkIn,
    check_in_time: checkIn,
    check_out_date: checkOut,
    check_out_time: checkOut,
    total_guests: Math.max(1, parseInt(String(body.total_guests ?? 1), 10) || 1),
    purpose_of_visit: text(body.purpose_of_visit) || 'Leisure',
    is_celebration: Boolean(body.is_celebration),
    celebration_type: body.is_celebration ? text(body.celebration_type) : null,
    celebration_note: body.is_celebration ? text(body.celebration_note) : null,
    selected_addons: Array.isArray(body.selected_addons) ? body.selected_addons : [],
  };
}

export type CheckInFields = ReturnType<typeof checkInFields>;
