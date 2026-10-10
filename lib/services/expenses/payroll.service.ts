import { buildPayroll } from './payroll.util';
import { periodRange } from './period.util';

const missing = (e: any) => e && ['42P01', 'PGRST205', '42703'].includes(e.code);

/** The month's payroll for the venue: every employee's salary, advances, payments and balance. */
export async function getPayroll(supabase: any, businessId: string, period: string) {
  const { first, last } = periodRange(period);
  const [staff, advances, payments] = await Promise.all([
    supabase.from('staff_profiles').select('id, name, contact_number, designation, department, role, join_date, end_date, status, base_salary')
      .eq('business_id', businessId).order('name'),
    supabase.from('staff_advances').select('id, staff_id, amount, date_given, notes')
      .eq('business_id', businessId).gte('date_given', first).lte('date_given', last),
    supabase.from('staff_salary_payments').select('id, staff_id, amount, paid_on, method, notes')
      .eq('business_id', businessId).eq('period', period),
  ]);
  if (staff.error) throw staff.error;
  if (advances.error) throw advances.error;
  if (payments.error && !missing(payments.error)) throw payments.error;
  const payroll = buildPayroll(staff.data || [], advances.data || [], payments.data || [], period);
  return { period, ...payroll, needs_update: missing(payments.error) };
}

/** One employee's advances and salary payments for the month, newest first. */
export async function getStaffLedger(supabase: any, businessId: string, staffId: string, period: string) {
  const { first, last } = periodRange(period);
  const [advances, payments] = await Promise.all([
    supabase.from('staff_advances').select('id, amount, date_given, notes, created_at')
      .eq('business_id', businessId).eq('staff_id', staffId).gte('date_given', first).lte('date_given', last),
    supabase.from('staff_salary_payments').select('id, amount, paid_on, method, notes, created_at')
      .eq('business_id', businessId).eq('staff_id', staffId).eq('period', period),
  ]);
  if (advances.error) throw advances.error;
  const entries = [
    ...(advances.data || []).map((a: any) => ({ id: a.id, kind: 'advance' as const, amount: Number(a.amount), date: a.date_given, notes: a.notes, method: null })),
    ...(payments.data || []).map((p: any) => ({ id: p.id, kind: 'salary' as const, amount: Number(p.amount), date: p.paid_on, notes: p.notes, method: p.method })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return { entries, needs_update: missing(payments.error) };
}

/** True when the employee belongs to this venue (and, if asked, is still working there). */
export async function staffBelongs(supabase: any, businessId: string, staffId: string, activeOnly = false) {
  const { data } = await supabase.from('staff_profiles').select('id, status').eq('id', staffId).eq('business_id', businessId).maybeSingle();
  return Boolean(data) && (!activeOnly || (data.status || 'ACTIVE') === 'ACTIVE');
}
