import { billSummary, recurringDue } from './bills.util';
import { periodRange, shiftPeriod } from './period.util';

const LEGACY = ['category', 'custom_category_name', 'amount', 'billing_date', 'status', 'notes'];
const newColumnsMissing = (e: any) => e && ['42703', 'PGRST204'].includes(e.code);

/** Bills dated in the month, their totals, and repeating bills from last month not yet added. */
export async function getBills(supabase: any, businessId: string, period: string, today: string) {
  const { first, last } = periodRange(period);
  const prev = periodRange(shiftPeriod(period, -1));
  const [cur, before] = await Promise.all([
    supabase.from('operational_expenses').select('*').eq('business_id', businessId)
      .gte('billing_date', first).lte('billing_date', last).order('billing_date', { ascending: false }),
    supabase.from('operational_expenses').select('*').eq('business_id', businessId)
      .gte('billing_date', prev.first).lte('billing_date', prev.last),
  ]);
  if (cur.error) throw cur.error;
  const bills = cur.data || [];
  return {
    period, bills, summary: billSummary(bills, today),
    recurring_due: recurringDue(before.data || [], bills, period),
    // Before migration 20261010000009 rows have no repeat/due/vendor columns.
    needs_update: bills.length > 0 && !('is_recurring' in bills[0]),
  };
}

/** Writes a bill; before the migration only the original columns are saved. */
export async function saveBill(supabase: any, businessId: string, values: Record<string, unknown>, id?: string) {
  const write = (v: Record<string, unknown>) => (id
    ? supabase.from('operational_expenses').update(v).eq('id', id).eq('business_id', businessId).select().maybeSingle()
    : supabase.from('operational_expenses').insert({ ...v, business_id: businessId }).select().single());
  const stamped = id ? { ...values, updated_at: new Date().toISOString() } : values;
  let res = await write(stamped);
  if (newColumnsMissing(res.error)) {
    res = await write(Object.fromEntries(Object.entries(values).filter(([k]) => LEGACY.includes(k))));
  }
  if (res.error) throw res.error;
  return res.data;
}
