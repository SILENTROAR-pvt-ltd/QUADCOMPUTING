import { SupabaseClient } from '@supabase/supabase-js';
import { adminDb } from '@/lib/supabase/admin';
import { businessDateString, businessDayRange, businessHour, isDateOnly, SETTLED_STATUSES } from '@/lib/utils/business-day';

export interface ZReportSummary {
  gross_revenue: number;
  total_discounts: number;
  net_revenue: number;
  cgst: number;
  sgst: number;
  total_tax: number;
  grand_total: number;
}

export interface PaymentBreakdown {
  cash: number;
  upi: number;
  wallet_redemption: number;
  card: number;
  other: number;
}

export interface OperationsMetrics {
  total_settled_orders: number;
  average_order_value: number;
}

export interface GstCompliance {
  gst_rate_percent: number;
  cgst_rate_percent: number;
  sgst_rate_percent: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  total_gst_amount: number;
}

export interface ZReportData {
  business_id: string;
  date: string;
  time_range: {
    start: string;
    end: string;
  };
  summary: ZReportSummary;
  payment_breakdown: PaymentBreakdown;
  operations: OperationsMetrics;
  gst_compliance: GstCompliance;
  hourly_distribution?: Array<{ hour: string; count: number; sales: number }>;
}

export function parseTargetDate(dateInput?: string | Date | null): { dateStr: string; startTs: Date; endTs: Date } {
  let dateStr: string;
  if (typeof dateInput === 'string' && isDateOnly(dateInput)) {
    dateStr = dateInput;
  } else if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    dateStr = businessDateString(dateInput);
  } else if (typeof dateInput === 'string' && !isNaN(Date.parse(dateInput))) {
    dateStr = businessDateString(new Date(dateInput));
  } else {
    dateStr = businessDateString();
  }

  const { start, end } = businessDayRange(dateStr);
  return { dateStr, startTs: start, endTs: end };
}

/**
 * getDailyZReport()
 * Computes Z-Report analytics strictly from settled orders (orders.status = 'settled').
 * Attempts calling the generate_daily_z_report RPC, falling back to direct table aggregation.
 */
export async function getDailyZReport(
  businessId: string,
  dateInput?: string | Date | null,
  client?: SupabaseClient
): Promise<ZReportData> {
  const db = client || adminDb();
  const { dateStr, startTs, endTs } = parseTargetDate(dateInput);

  // 1. Try PostgreSQL RPC first
  try {
    const { data: rpcData, error: rpcError } = await db.rpc('generate_daily_z_report', {
      p_business_id: businessId,
      p_date: dateStr,
    });

    if (!rpcError && rpcData && typeof rpcData === 'object' && rpcData.summary) {
      return rpcData as ZReportData;
    }
  } catch {
    // Proceed to application-level aggregation fallback
  }

  // 2. Direct Query Fallback strictly filtered by orders.status = 'settled'
  const { data: orders, error: ordersError } = await db
    .from('orders')
    .select('*')
    .eq('business_id', businessId)
    .in('status', [...SETTLED_STATUSES])
    .gte('created_at', startTs.toISOString())
    .lte('created_at', endTs.toISOString())
    .order('created_at', { ascending: true });

  if (ordersError) {
    throw new Error(`Failed to fetch settled orders: ${ordersError.message}`);
  }

  const settledOrders = orders || [];

  let gross_revenue = 0;
  let total_discounts = 0;
  let total_tax = 0;
  let grand_total = 0;

  let cash = 0;
  let upi = 0;
  let wallet_redemption = 0;
  let card = 0;
  let other = 0;

  const hourlyMap: Record<string, { count: number; sales: number }> = {};
  for (let h = 0; h < 24; h++) {
    const label = `${String(h).padStart(2, '0')}:00`;
    hourlyMap[label] = { count: 0, sales: 0 };
  }

  for (const order of settledOrders) {
    const sub = Number(order.subtotal) || 0;
    const disc = Number(order.discount_amount) || 0;
    const tax = Number(order.tax_amount) || 0;
    const gt = Number(order.grand_total) || (sub - disc + tax);

    gross_revenue += sub;
    total_discounts += disc;
    total_tax += tax;
    grand_total += gt;

    const pm = (order.payment_method || '').toLowerCase();
    if (pm === 'cash') cash += gt;
    else if (pm === 'upi') upi += gt;
    else if (pm.includes('wallet')) wallet_redemption += gt;
    else if (pm === 'card') card += gt;
    else other += gt;

    const orderDate = new Date(order.created_at);
    if (!isNaN(orderDate.getTime())) {
      const hStr = `${String(businessHour(orderDate)).padStart(2, '0')}:00`;
      if (hourlyMap[hStr]) {
        hourlyMap[hStr].count += 1;
        hourlyMap[hStr].sales += gt;
      }
    }
  }

  const net_revenue = Math.round((gross_revenue - total_discounts) * 100) / 100;
  const roundedTax = Math.round(total_tax * 100) / 100;
  const cgst = Math.round((roundedTax / 2) * 100) / 100;
  const sgst = Math.round((roundedTax / 2) * 100) / 100;
  const roundedGrandTotal = Math.round(grand_total * 100) / 100;
  const totalOrdersCount = settledOrders.length;
  const aov = totalOrdersCount > 0 ? Math.round((roundedGrandTotal / totalOrdersCount) * 100) / 100 : 0;

  const hourly_distribution = Object.entries(hourlyMap).map(([hour, val]) => ({
    hour,
    count: val.count,
    sales: Math.round(val.sales * 100) / 100,
  }));

  return {
    business_id: businessId,
    date: dateStr,
    time_range: {
      start: startTs.toISOString(),
      end: endTs.toISOString(),
    },
    summary: {
      gross_revenue: Math.round(gross_revenue * 100) / 100,
      total_discounts: Math.round(total_discounts * 100) / 100,
      net_revenue,
      cgst,
      sgst,
      total_tax: roundedTax,
      grand_total: roundedGrandTotal,
    },
    payment_breakdown: {
      cash: Math.round(cash * 100) / 100,
      upi: Math.round(upi * 100) / 100,
      wallet_redemption: Math.round(wallet_redemption * 100) / 100,
      card: Math.round(card * 100) / 100,
      other: Math.round(other * 100) / 100,
    },
    operations: {
      total_settled_orders: totalOrdersCount,
      average_order_value: aov,
    },
    gst_compliance: {
      gst_rate_percent: 5.0,
      cgst_rate_percent: 2.5,
      sgst_rate_percent: 2.5,
      taxable_amount: net_revenue,
      cgst_amount: cgst,
      sgst_amount: sgst,
      total_gst_amount: roundedTax,
    },
    hourly_distribution,
  };
}
