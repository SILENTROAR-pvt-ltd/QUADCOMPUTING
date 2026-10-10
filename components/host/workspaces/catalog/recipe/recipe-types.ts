export interface RawItem {
  id: string;
  item_name: string;
  unit: string;
  cost_per_unit?: number;
  current_stock?: number;
  is_critical?: boolean;
}

export interface RecipeIngredient {
  id?: string;
  raw_item_id: string;
  /** Stored in the raw material's base unit: kg and ltr are kept as kg and ltr. */
  quantity_required: number;
  raw_item?: RawItem;
}
