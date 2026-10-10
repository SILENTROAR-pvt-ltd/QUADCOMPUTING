export interface DashboardChartPoint {
  label: string;
  revenue: number;
  expenses?: number;
  orders: number;
  timestamp: string;
}

export interface DashboardKpis {
  net_sales: number;
  settled_bills: number;
  avg_bill: number;
  open_bills: number;
  open_value: number;
  unique_guests: number;
  margin_pct: number | null;
  previous_net_sales: number;
  growth_pct: number | null;
  grain: 'hour' | 'day' | 'month';
}

export interface DashboardAnalyticsPayload {
  sales_overview: {
    gross_revenue: number;
    gross_profit: number;
    revenue_growth: number;
  };
  user_engagement: {
    total_orders_today: number;
  };
  order_status: {
    total: number;
    completed: number;
    pending_kitchen: number;
  };
  /** Present from the analytics service; older responses may not have it. */
  kpis?: DashboardKpis;
  best_selling: Array<{ id: string; name: string; sold_count: number; revenue: number }>;
  chartData?: DashboardChartPoint[];
  active_promotions: Array<{ id: string; name: string; discount_type: string; value: number }>;
  critical_items: Array<{ id: string; name: string; current_stock: number; unit: string; reorder_level: number }>;
  revenue_trends: Array<{ timestamp: string; revenue: number; expenses: number }>;
  payment_breakdown: { upi: number; cash: number; card: number; other?: number };

  start_date: string;
  end_date: string;
  total_discounts_given: number;
  total_gst_collected: number;
  actual_cogs: number;
}
