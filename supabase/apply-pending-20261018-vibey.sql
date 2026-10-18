-- ============================================================================
-- apply-pending-20261018-vibey.sql  - run ONCE in the Supabase SQL editor (project: Quad Computing, main).
-- Adds Vibey's per-venue switches (off by default) and its turn log (no guest text stored). Safe to re-run; nothing is
-- dropped. Until it is run, Vibey still works for venues listed in VIBEY_PILOT_VENUES and simply logs nothing.
-- To switch Vibey on for one pilot venue afterwards:
--   UPDATE public.businesses SET vibey_guest_enabled = true, vibey_host_enabled = true WHERE id = '<venue id>';
-- ============================================================================

-- ###################### 20261018000004_vibey.sql ######################
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS vibey_guest_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS vibey_host_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.vibey_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  surface text NOT NULL CHECK (surface IN ('guest', 'host')),
  table_number text CHECK (table_number IS NULL OR char_length(table_number) <= 12),
  intent text NOT NULL CHECK (char_length(intent) <= 32),
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  path text NOT NULL CHECK (path IN ('fastpath', 'model', 'fallback', 'keyword')),
  model text CHECK (model IS NULL OR char_length(model) <= 80),
  latency_ms integer NOT NULL DEFAULT 0 CHECK (latency_ms >= 0),
  tokens_in integer NOT NULL DEFAULT 0 CHECK (tokens_in >= 0),
  tokens_out integer NOT NULL DEFAULT 0 CHECK (tokens_out >= 0),
  error_code text CHECK (error_code IS NULL OR char_length(error_code) <= 40),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vibey_turns_business_created ON public.vibey_turns (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vibey_turns_created ON public.vibey_turns (created_at);

ALTER TABLE public.vibey_turns ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vibey_turns FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.vibey_trim_turns(keep_days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed integer;
BEGIN
  DELETE FROM public.vibey_turns WHERE created_at < now() - make_interval(days => GREATEST(keep_days, 1));
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;

REVOKE ALL ON FUNCTION public.vibey_trim_turns(integer) FROM PUBLIC, anon, authenticated;

-- Daily trim at 03:15 UTC, only when pg_cron is available on this project.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'vibey_trim_turns';
    PERFORM cron.schedule('vibey_trim_turns', '15 3 * * *', 'SELECT public.vibey_trim_turns(90)');
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

-- ###################### CHECK (read-only) ######################
SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name LIKE 'vibey_%';
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'vibey_turns';