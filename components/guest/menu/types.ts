export interface ItemOption {
  id: string;
  catalog_item_id?: string;
  option_group_name?: string;
  option_name: string;
  additional_price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  type?: 'food' | 'drink' | 'accommodation' | 'service' | string;
  item_type?: string;
  image_url?: string;
  /** The diet the host chose ('veg' | 'non_veg' | 'vegan' | 'egg'); see lib/guest/dish-mark for how it is shown. */
  dietary?: string | null;
  available?: boolean;
  item_options?: ItemOption[];
  options?: ItemOption[];
  customization_groups?: any[];
}

export interface ActiveOrderItem {
  id: string;
  item_name: string;
  price: number;
  quantity: number;
  notes?: string;
  kot_status: 'pending' | 'cooking' | 'served' | 'cancelled';
  created_at: string;
}
