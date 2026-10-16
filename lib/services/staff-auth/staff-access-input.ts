import { asStaffRole, type StaffRole } from './staff-roles';
import { isFourDigitPin } from './staff-login.service';

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export interface NewStaff { name: string; role: StaffRole; pin: string }
export interface StaffChange { id: string; name?: string; role?: StaffRole; pin?: string; active?: boolean }

const cleanName = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);

/** A new staff member: a name, one of the three roles, and a 4-digit PIN. */
export function parseNewStaff(body: any): Parsed<NewStaff> {
  const name = cleanName(body?.name);
  if (name.length < 2) return { ok: false, error: 'Enter the staff member\'s name.' };
  const role = asStaffRole(body?.role);
  if (!role) return { ok: false, error: 'Choose Waiter, Chef or Cashier.' };
  if (!isFourDigitPin(body?.pin)) return { ok: false, error: 'The PIN is exactly 4 digits.' };
  return { ok: true, value: { name, role, pin: body.pin } };
}

/** A change to one staff member: any of name, role, a new PIN, or switching their access on or off. */
export function parseStaffChange(body: any): Parsed<StaffChange> {
  const id = String(body?.id ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: 'Missing staff member.' };
  const out: StaffChange = { id };
  if (body.name !== undefined) {
    out.name = cleanName(body.name);
    if (out.name.length < 2) return { ok: false, error: 'Enter the staff member\'s name.' };
  }
  if (body.role !== undefined) {
    const role = asStaffRole(body.role);
    if (!role) return { ok: false, error: 'Choose Waiter, Chef or Cashier.' };
    out.role = role;
  }
  if (body.pin !== undefined) {
    if (!isFourDigitPin(body.pin)) return { ok: false, error: 'The PIN is exactly 4 digits.' };
    out.pin = body.pin;
  }
  if (body.active !== undefined) out.active = Boolean(body.active);
  if (Object.keys(out).length === 1) return { ok: false, error: 'Nothing to change.' };
  return { ok: true, value: out };
}
