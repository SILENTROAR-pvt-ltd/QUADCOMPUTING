CREATE TABLE IF NOT EXISTS public.bill_request_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    session_id uuid REFERENCES public.dine_in_sessions(id) ON DELETE SET NULL,
    table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
    guest_session_id text,
    table_number text NOT NULL,
    requested_at timestamptz NOT NULL DEFAULT now(),
    item_count integer NOT NULL DEFAULT 0,
    running_total numeric NOT NULL DEFAULT 0,
    settled_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_bill_request_events_business_time
    ON public.bill_request_events(business_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_bill_request_events_session
    ON public.bill_request_events(session_id);

ALTER TABLE public.bill_request_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts read bill request history" ON public.bill_request_events;
CREATE POLICY "Hosts read bill request history" ON public.bill_request_events
    FOR SELECT USING (
        business_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid())
    );

DROP POLICY IF EXISTS "Guests create bill request history" ON public.bill_request_events;
CREATE POLICY "Guests create bill request history" ON public.bill_request_events
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Hosts update bill request history" ON public.bill_request_events;
CREATE POLICY "Hosts update bill request history" ON public.bill_request_events
    FOR UPDATE USING (
        business_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid())
    ) WITH CHECK (
        business_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid())
    );