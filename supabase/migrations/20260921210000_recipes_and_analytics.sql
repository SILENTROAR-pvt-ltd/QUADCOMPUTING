-- 1. Add payment_method to orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'UPI' CHECK (payment_method IN ('UPI', 'CASH', 'CARD'));

-- 2. RECIPE INGREDIENTS TABLE
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  catalog_item_id UUID REFERENCES catalog_items(id) ON DELETE CASCADE,
  raw_item_id UUID REFERENCES raw_inventory_items(id) ON DELETE CASCADE,
  quantity_required NUMERIC NOT NULL, -- e.g., 0.150 for 150g or 0.200 for 200ml
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(catalog_item_id, raw_item_id)
);

CREATE INDEX IF NOT EXISTS idx_recipes_catalog_item ON recipe_ingredients(catalog_item_id);

-- 3. ENHANCE INVENTORY LOGS FOR COGS SNAPSHOTTING
ALTER TABLE inventory_logs
ADD COLUMN IF NOT EXISTS unit_cost_at_time NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0;

-- 4. ATOMIC STOCK DEDUCTION RPC (Prevents Race Conditions)
CREATE OR REPLACE FUNCTION deduct_inventory_stock(
  p_raw_item_id UUID,
  p_qty_to_deduct NUMERIC,
  p_business_id UUID,
  p_notes TEXT
) RETURNS VOID AS $$
DECLARE
  v_unit_cost NUMERIC := 0;
  v_total_cost NUMERIC := 0;
BEGIN
  -- Get current unit cost for snapshotting
  SELECT COALESCE(cost_per_unit, 0) INTO v_unit_cost 
  FROM raw_inventory_items WHERE id = p_raw_item_id;

  v_total_cost := v_unit_cost * p_qty_to_deduct;

  -- Atomic Decrement (Allows negative stock, never throws hardware lock)
  UPDATE raw_inventory_items
  SET current_stock = current_stock - p_qty_to_deduct,
      updated_at = NOW()
  WHERE id = p_raw_item_id;

  -- Insert Log Snapshot
  INSERT INTO inventory_logs (
    business_id,
    item_id,
    action_type,
    change_amount,
    unit_cost_at_time,
    total_cost,
    notes
  ) VALUES (
    p_business_id,
    p_raw_item_id,
    'CONSUMPTION',
    -p_qty_to_deduct,
    v_unit_cost,
    v_total_cost,
    p_notes
  );
END;
$$ LANGUAGE plpgsql;
