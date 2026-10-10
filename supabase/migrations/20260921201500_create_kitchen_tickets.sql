-- KITCHEN TICKETS TABLE
CREATE TABLE IF NOT EXISTS kitchen_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  ticket_number TEXT NOT NULL,
  table_or_room TEXT DEFAULT 'Counter / Takeaway',
  items JSONB NOT NULL, -- Array of { name, quantity, notes, category }
  status TEXT CHECK (status IN ('PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED')) DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for ultra-fast kitchen status filtering
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_biz_status 
ON kitchen_tickets(business_id, status);
