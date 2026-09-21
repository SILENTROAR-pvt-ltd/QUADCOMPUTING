CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  subtotal NUMERIC NOT NULL,
  discount_type TEXT,
  discount_value NUMERIC,
  discount_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  grand_total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can insert and read their own orders" ON orders
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE host_id = auth.uid()
    )
  );
