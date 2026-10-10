-- ============================================================================
-- 20261009000004_guest_profile_traveller.sql   (safe to re-run)
--
-- Guest profile: how the guest travels (traveller type) and a one-line intro.
-- Both are optional, so existing accounts are unchanged. Apply in the Supabase SQL editor.
-- The allowed types must match lib/guest/traveller-types.ts.
-- ============================================================================

BEGIN;

ALTER TABLE public.guest_accounts ADD COLUMN IF NOT EXISTS traveller_type text;
ALTER TABLE public.guest_accounts ADD COLUMN IF NOT EXISTS intro text;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'guest_accounts_traveller_type_check') THEN
        ALTER TABLE public.guest_accounts ADD CONSTRAINT guest_accounts_traveller_type_check
            CHECK (traveller_type IS NULL OR traveller_type IN
                   ('solo', 'backpacker', 'family', 'couple', 'business', 'foodie', 'group', 'local'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'guest_accounts_intro_length_check') THEN
        ALTER TABLE public.guest_accounts ADD CONSTRAINT guest_accounts_intro_length_check
            CHECK (intro IS NULL OR char_length(intro) <= 80);
    END IF;
END $$;

COMMIT;
