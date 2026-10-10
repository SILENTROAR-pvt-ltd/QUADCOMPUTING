-- 1. Add `is_critical` flag to raw_inventory_items for Theft Detection tracking
ALTER TABLE raw_inventory_items 
ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT false;

-- 2. Add `status` column to orders to support POS Auto-Depletion Engine
-- Default to 'COMPLETED' so old orders don't break existing logic
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('PENDING', 'COMPLETED', 'SERVED', 'CANCELLED')) DEFAULT 'COMPLETED';

-- 3. Create inventory_audits table for EOD Shift Variance Tracking
CREATE TABLE IF NOT EXISTS inventory_audits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  raw_item_id UUID REFERENCES raw_inventory_items(id) ON DELETE CASCADE,
  audit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  theoretical_stock NUMERIC NOT NULL,
  physical_stock NUMERIC NOT NULL,
  variance NUMERIC GENERATED ALWAYS AS (physical_stock - theoretical_stock) STORED,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_inventory_audits_biz_date ON inventory_audits(business_id, audit_date);
CREATE INDEX IF NOT EXISTS idx_raw_items_critical ON raw_inventory_items(business_id, is_critical);

-- RLS
ALTER TABLE inventory_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts can insert and read inventory audits" ON inventory_audits
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE host_id = auth.uid()
    )
  );
