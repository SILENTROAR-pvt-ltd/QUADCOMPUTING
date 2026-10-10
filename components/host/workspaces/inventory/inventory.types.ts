export interface RawInventoryItem {
  id: string;
  item_name: string;
  category: string;
  unit: string;
  current_stock: number;
  threshold: number;
  cost_per_unit: number;
  updated_at: string;
  is_critical?: boolean;
}
