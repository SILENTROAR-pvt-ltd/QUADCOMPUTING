// Statutory exports. GST: every venue's settled bills by month (bills, gross, discounts, taxable value, GST, total),
// with its GSTIN. Form C: foreign guests' stays (the fields the FRRO form asks for), only for the range and venue asked,
// and every Form C export is recorded in the admin log because it carries passport details.
import { csvCell } from '@/lib/utils/csv';
import { businessDayRange } from '@/lib/utils/business-day';
import { gstStatusOf } from '@/lib/services/billing/gst-policy';
import { loadDaily } from './rollup.service';
import { readAll } from './read-all';

const row = (...values: unknown[]) => values.map(csvCell).join(',');
const r2 = (n: number) => Math.round(n * 100) / 100;
export const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function gstCsv(db: any, fromDay: string, toDay: string): Promise<{ csv: string; rows: number }> {
  const [daily, biz] = await Promise.all([
    loadDaily(db, businessDayRange(fromDay).start.toISOString()),
    readAll(db, 'businesses', 'id, business_name, name, legal_name, gst_number, gst_verified_number'),
  ]);
  const venues = new Map<string, any>((biz.data || []).map((b: any) => [b.id, b]));
  const agg = new Map<string, { month: string; venue: string; bills: number; gross: number; discount: number; tax: number; total: number }>();
  for (const d of daily.data.filter((x) => x.day >= fromDay && x.day <= toDay)) {
    const key = `${d.day.slice(0, 7)}|${d.venue_id}`;
    const a = agg.get(key) ?? { month: d.day.slice(0, 7), venue: d.venue_id, bills: 0, gross: 0, discount: 0, tax: 0, total: 0 };
    a.bills += d.orders; a.gross += d.subtotal; a.discount += d.discount; a.tax += d.tax; a.total += d.gmv;
    agg.set(key, a);
  }
  const lines = [row('Month', 'Venue', 'Legal name', 'GSTIN', 'GSTIN confirmed by owner', 'Bills', 'Gross (INR)', 'Discounts (INR)', 'Taxable value (INR)', 'GST collected (INR)', 'Total billed (INR)')];
  for (const a of Array.from(agg.values()).sort((x, y) => x.month.localeCompare(y.month) || x.venue.localeCompare(y.venue))) {
    const b = venues.get(a.venue) || {};
    const gst = gstStatusOf(b);
    lines.push(row(a.month, b.business_name || b.name || a.venue, b.legal_name || '', gst.gstin || '', gst.verified ? 'yes' : 'no', a.bills,
      r2(a.gross), r2(a.discount), r2(a.gross - a.discount), r2(a.tax), r2(a.total)));
  }
  return { csv: lines.join('\n'), rows: lines.length - 1 };
}

export async function formCCsv(db: any, fromDay: string, toDay: string, venueId: string | null): Promise<{ csv: string; rows: number }> {
  let q = db.from('room_stay_logs')
    .select('business_id, room_id, guest_name, country_of_origin, passport_number, visa_number, visa_expiry_date, check_in_time, check_out_time, purpose_of_visit, guest_address, total_guests')
    .eq('is_foreign_national', true).is('anonymized_at', null)
    .gte('check_in_time', businessDayRange(fromDay).start.toISOString()).lte('check_in_time', businessDayRange(toDay).end.toISOString())
    .order('check_in_time', { ascending: true }).limit(5000);
  if (venueId) q = q.eq('business_id', venueId);
  const [stays, biz, rooms] = await Promise.all([q, readAll(db, 'businesses', 'id, business_name, name'), readAll(db, 'rooms', 'id, room_number')]);
  if (stays.error) throw stays.error;
  const names = new Map<string, string>((biz.data || []).map((b: any) => [b.id, b.business_name || b.name]));
  const roomNo = new Map<string, string>((rooms.data || []).map((r: any) => [r.id, r.room_number]));
  const lines = [row('Venue', 'Guest name', 'Country', 'Passport number', 'Visa number', 'Visa expiry', 'Check-in', 'Check-out', 'Room', 'Guests', 'Purpose of visit', 'Address')];
  for (const s of stays.data || []) {
    lines.push(row(names.get(s.business_id) || s.business_id, s.guest_name, s.country_of_origin, s.passport_number, s.visa_number, s.visa_expiry_date,
      s.check_in_time, s.check_out_time, roomNo.get(s.room_id) || '', s.total_guests, s.purpose_of_visit, s.guest_address));
  }
  return { csv: lines.join('\n'), rows: lines.length - 1 };
}
