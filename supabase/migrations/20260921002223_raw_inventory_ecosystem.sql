CREATE TABLE IF NOT EXISTS raw_inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT DEFAULT 'Raw Stock',
  unit TEXT DEFAULT 'kg', -- kg, ltr, pcs
  current_stock NUMERIC DEFAULT 0,
  threshold NUMERIC DEFAULT 5,
  cost_per_unit NUMERIC DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  item_id UUID REFERENCES raw_inventory_items(id) ON DELETE CASCADE,
  change_amount NUMERIC NOT NULL,
  action_type TEXT, -- 'PURCHASE', 'MANUAL_ADJUSTMENT', 'CONSUMPTION'
  notes TEXT,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
