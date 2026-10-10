import { resolveAnalyticsDateRange } from './analytics/date-range.util';
import { fetchAnalyticsData, fetchPreviousNetSales } from './analytics/fetch-data.service';
import { buildInitialTrendsMap, grainFor } from './analytics/trends-builder.util';
import { aggregateOrdersAndLogs } from './analytics/aggregations.util';
import { computeOrderAndInventoryStatus } from './analytics/order-status.util';

const round1 = (n: number) => Math.round(n * 10) / 10;

export async function computeEodReport(requestUrl: string, supabase: any) {
  const { timeframe, startDate, endDate } = resolveAnalyticsDateRange(requestUrl);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Unauthorized');

  const { data: business } = await supabase.from('businesses').select('id').eq('host_id', user.id).single();
  if (!business) throw new Error('Business not found');

  const [{ orders, tickets, logs, rawItems, rawPromos }, previous_net_sales] = await Promise.all([
    fetchAnalyticsData(supabase, business.id, startDate, endDate),
    fetchPreviousNetSales(supabase, business.id, startDate, endDate),
  ]);

  const grain = grainFor(timeframe, startDate, endDate);
  const trendsMap = buildInitialTrendsMap(timeframe, startDate, endDate);
  const agg = aggregateOrdersAndLogs(orders, logs, grain, trendsMap);
  const { total_orders, completed_orders, pending_kitchen, critical_items, active_promotions } =
    computeOrderAndInventoryStatus(orders, tickets, rawItems, rawPromos);

  const trend = Object.entries(trendsMap).sort(([a], [b]) => a.localeCompare(b)).map(([, d]) => d);
  const gross_profit = agg.gross_revenue - agg.actual_cogs;
  const growth_pct = previous_net_sales > 0 ? round1(((agg.gross_revenue - previous_net_sales) / previous_net_sales) * 100) : null;

  return {
    sales_overview: { gross_revenue: agg.gross_revenue, gross_profit, revenue_growth: growth_pct ?? 0 },
    user_engagement: { total_orders_today: total_orders },
    order_status: { total: total_orders, completed: completed_orders, pending_kitchen },
    kpis: {
      net_sales: agg.gross_revenue,
      settled_bills: agg.settled_bills,
      avg_bill: agg.settled_bills > 0 ? agg.gross_revenue / agg.settled_bills : 0,
      open_bills: agg.open_bills,
      open_value: agg.open_value,
      unique_guests: agg.unique_guests,
      margin_pct: agg.gross_revenue > 0 ? round1((gross_profit / agg.gross_revenue) * 100) : null,
      previous_net_sales,
      growth_pct,
      grain,
    },
    best_selling: agg.best_selling,
    active_promotions,
    critical_items,
    revenue_trends: trend.map((d) => ({ timestamp: d.timestamp, revenue: d.revenue, expenses: d.expenses })),
    chartData: trend.map((d) => ({ label: d.label, revenue: d.revenue, expenses: d.expenses, orders: d.orders, timestamp: d.timestamp })),
    payment_breakdown: agg.payment_breakdown,
    start_date: startDate,
    end_date: endDate,
    total_discounts_given: agg.total_discounts_given,
    total_gst_collected: agg.total_gst_collected,
    actual_cogs: agg.actual_cogs,
  };
}
