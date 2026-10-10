export type StockStatus = 'ok' | 'low' | 'out' | 'negative';

export interface StockItemView {
  id: string;
  item_name: string;
  category: string;
  unit: string;
  current_stock: number;
  /** Reorder level: at or below it the item needs ordering. */
  threshold: number;
  /** Weighted-average cost of the stock on hand. */
  cost_per_unit: number;
  supplier_name: string | null;
  is_critical: boolean;
  updated_at: string;
  status: StockStatus;
  value: number;
  /** Average used per day by sold dishes over the last 7 days. */
  daily_use: number;
  /** Days the stock lasts at that rate; null when nothing was used. */
  days_cover: number | null;
  suggested_order: number;
  /** Menu dishes whose recipe uses this item. */
  recipes: number;
  last_movement_at: string | null;
}

export interface InventorySummary {
  stock_value: number;
  item_count: number;
  attention_count: number;
  negative_count: number;
  used_today_value: number;
  used_7d_value: number;
  wastage_7d_value: number;
  purchases_30d_value: number;
  count_loss_30d_value: number;
  supplier_count: number;
  recipe_coverage: { linked: number; total: number };
}

export interface InventoryOverview { items: StockItemView[]; summary: InventorySummary }

export interface StockMovement {
  id: string;
  item_id: string;
  item_name: string;
  unit: string;
  action_type: string;
  change_amount: number;
  total_cost: number;
  stock_after: number | null;
  supplier_name: string | null;
  reference: string | null;
  notes: string | null;
  logged_at: string;
}
