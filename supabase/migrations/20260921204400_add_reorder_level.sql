-- Add reorder_level to raw_inventory_items for Dashboard critical alerts
ALTER TABLE raw_inventory_items
ADD COLUMN IF NOT EXISTS reorder_level NUMERIC DEFAULT 10;
