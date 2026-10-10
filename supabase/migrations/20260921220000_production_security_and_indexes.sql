-- 1. Enable RLS across core tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

-- 2. Tenant Isolation Policies
-- Aligned with the live schema: resolving business_id from businesses table via host_id (auth.uid)
CREATE POLICY tenant_orders_policy ON orders
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid()));

CREATE POLICY tenant_kitchen_policy ON kitchen_tickets
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid()));

CREATE POLICY tenant_inventory_policy ON raw_inventory_items
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid()));

CREATE POLICY tenant_logs_policy ON inventory_logs
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid()));

-- 3. Composite Indexes for High-Velocity Query Optimization
CREATE INDEX IF NOT EXISTS idx_orders_business_created ON orders (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_logged ON inventory_logs (business_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_status ON kitchen_tickets (business_id, status);
