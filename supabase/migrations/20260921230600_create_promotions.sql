CREATE TABLE IF NOT EXISTS promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  title TEXT NOT NULL,
  code TEXT,
  discount_type TEXT CHECK (discount_type IN ('PERCENTAGE', 'FLAT')),
  discount_value NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their own promotions" ON promotions
FOR SELECT USING (
  business_id IN (
    SELECT id FROM businesses WHERE host_id = auth.uid()
  )
);

CREATE POLICY "Hosts can insert their own promotions" ON promotions
FOR INSERT WITH CHECK (
  business_id IN (
    SELECT id FROM businesses WHERE host_id = auth.uid()
  )
);

CREATE POLICY "Hosts can update their own promotions" ON promotions
FOR UPDATE USING (
  business_id IN (
    SELECT id FROM businesses WHERE host_id = auth.uid()
  )
);

CREATE POLICY "Hosts can delete their own promotions" ON promotions
FOR DELETE USING (
  business_id IN (
    SELECT id FROM businesses WHERE host_id = auth.uid()
  )
);
