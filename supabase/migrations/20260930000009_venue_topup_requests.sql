-- ============================================================
-- MIGRATION: Venue Top-Up Requests & Manual Approval Ecosystem
-- ============================================================

CREATE TABLE IF NOT EXISTS public.venue_topup_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    venue_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    amount numeric(10, 2) NOT NULL CHECK (amount > 0),
    utr_number text NOT NULL,
    payment_method text NOT NULL DEFAULT 'upi_manual',
    requested_plan_tier text CHECK (requested_plan_tier IN ('8k_2m', '12k_6m', '14k_9m', 'pay_as_you_go')),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes text,
    reviewed_by text,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT venue_topup_requests_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_venue_topup_requests_venue ON public.venue_topup_requests(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_topup_requests_status ON public.venue_topup_requests(status);
CREATE INDEX IF NOT EXISTS idx_venue_topup_requests_created ON public.venue_topup_requests(created_at DESC);

-- Auto-update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.update_topup_requests_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_topup_requests_updated_at ON public.venue_topup_requests;
CREATE TRIGGER trg_topup_requests_updated_at
  BEFORE UPDATE ON public.venue_topup_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_topup_requests_updated_at();

-- RLS Configuration
ALTER TABLE public.venue_topup_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select venue_topup_requests" ON public.venue_topup_requests;
CREATE POLICY "Public select venue_topup_requests"
  ON public.venue_topup_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert venue_topup_requests" ON public.venue_topup_requests;
CREATE POLICY "Public insert venue_topup_requests"
  ON public.venue_topup_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update venue_topup_requests" ON public.venue_topup_requests;
CREATE POLICY "Public update venue_topup_requests"
  ON public.venue_topup_requests FOR UPDATE USING (true);
