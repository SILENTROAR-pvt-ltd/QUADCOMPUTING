-- ============================================================================
-- 20261010000008_vendors_and_purchase_orders.sql   (safe to re-run)
--
-- Purchasing for raw inventory:
--   inventory_vendors  - the venue's suppliers with their WhatsApp number.
--   purchase_orders    - an order sent to a vendor (lines, estimated value), then
--                        received into stock (each line becomes a PURCHASE movement
--                        through record_inventory_movement) or cancelled.
-- Row level security limits both to the venue's host and staff.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inventory_vendors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
    phone text CHECK (phone IS NULL OR phone ~ '^[0-9]{10,15}$'),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_vendors_name ON public.inventory_vendors (business_id, lower(trim(name)));

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    reference text NOT NULL,
    vendor_id uuid REFERENCES public.inventory_vendors(id) ON DELETE SET NULL,
    vendor_name text NOT NULL,
    vendor_phone text,
    lines jsonb NOT NULL DEFAULT '[]'::jsonb,
    estimated_total numeric NOT NULL DEFAULT 0,
    note text,
    status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'received', 'cancelled')),
    sent_at timestamptz NOT NULL DEFAULT now(),
    received_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_purchase_orders_ref ON public.purchase_orders (business_id, reference);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_biz_status ON public.purchase_orders (business_id, status, sent_at DESC);

ALTER TABLE public.inventory_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Host and staff access inventory_vendors" ON public.inventory_vendors;
CREATE POLICY "Host and staff access inventory_vendors" ON public.inventory_vendors
    FOR ALL TO authenticated
    USING (business_id = ANY(public.get_auth_business_ids()))
    WITH CHECK (business_id = ANY(public.get_auth_business_ids()));

DROP POLICY IF EXISTS "Host and staff access purchase_orders" ON public.purchase_orders;
CREATE POLICY "Host and staff access purchase_orders" ON public.purchase_orders
    FOR ALL TO authenticated
    USING (business_id = ANY(public.get_auth_business_ids()))
    WITH CHECK (business_id = ANY(public.get_auth_business_ids()));

REVOKE ALL ON public.inventory_vendors FROM anon;
REVOKE ALL ON public.purchase_orders FROM anon;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'purchase_orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_orders;
  END IF;
END $$;
