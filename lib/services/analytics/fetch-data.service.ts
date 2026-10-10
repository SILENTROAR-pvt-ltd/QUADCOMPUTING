import { SETTLED_STATUSES } from '@/lib/utils/business-day';

export async function fetchAnalyticsData(supabase: any, businessId: string, startDate: string, endDate: string) {
  const [
    { data: orders },
    { data: tickets },
    { data: logs },
    { data: rawItems },
    { data: rawPromos },
  ] = await Promise.all([
    supabase.from('orders').select('id, items, status, grand_total, discount_amount, tax_amount, payment_method, customer_name, customer_phone, created_at')
      .eq('business_id', businessId).gte('created_at', startDate).lte('created_at', endDate),
    supabase.from('kitchen_tickets').select('id, order_id, status')
      .eq('business_id', businessId).gte('created_at', startDate).lte('created_at', endDate),
    supabase.from('inventory_logs').select('total_cost, logged_at')
      .eq('business_id', businessId).eq('action_type', 'CONSUMPTION').gte('logged_at', startDate).lte('logged_at', endDate),
    supabase.from('raw_inventory_items').select('id, item_name, current_stock, unit, threshold')
      .eq('business_id', businessId),
    supabase.from('promotions').select('id, title, discount_type, discount_value')
      .eq('business_id', businessId).eq('is_active', true).order('created_at', { ascending: false }),
  ]);

  return { orders: orders || [], tickets: tickets || [], logs: logs || [], rawItems: rawItems || [], rawPromos: rawPromos || [] };
}

/** Settled sales in the period of the same length just before this one, for the growth figure. */
export async function fetchPreviousNetSales(supabase: any, businessId: string, startDate: string, endDate: string): Promise<number> {
  const start = Date.parse(startDate);
  const length = Date.parse(endDate) - start + 1;
  if (!Number.isFinite(length) || length <= 0) return 0;
  const { data, error } = await supabase.from('orders').select('grand_total')
    .eq('business_id', businessId)
    .in('status', [...SETTLED_STATUSES])
    .gte('created_at', new Date(start - length).toISOString())
    .lt('created_at', new Date(start).toISOString());
  if (error) return 0;
  return (data || []).reduce((sum: number, o: any) => sum + (Number(o.grand_total) || 0), 0);
}
