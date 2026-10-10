import type { DashboardAnalyticsPayload, DashboardKpis } from './dashboard.types';

/** The KPI block from the response, or a best-effort version from the older fields if it is missing. */
export function kpisOf(d: DashboardAnalyticsPayload): DashboardKpis {
  if (d.kpis) return d.kpis;
  const net = Number(d.sales_overview?.gross_revenue) || 0;
  const bills = Number(d.order_status?.completed) || 0;
  return {
    net_sales: net,
    settled_bills: bills,
    avg_bill: bills > 0 ? net / bills : 0,
    open_bills: 0,
    open_value: 0,
    unique_guests: 0,
    margin_pct: net > 0 ? Math.round(((Number(d.sales_overview?.gross_profit) || 0) / net) * 1000) / 10 : null,
    previous_net_sales: 0,
    growth_pct: null,
    grain: 'hour',
  };
}
