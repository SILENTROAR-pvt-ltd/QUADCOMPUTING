-- Diagnosis for "We could not set up your venue." Paste into the Supabase SQL editor and run.
--
-- It runs the real venue set-up (provision_host_business) for the newest sign-up that has no profile yet (the account
-- the onboarding page just created), inside a transaction that is ALWAYS rolled back: nothing is kept. If the set-up is
-- refused, the editor shows the exact error, including the constraint or trigger behind it. If it would succeed, the
-- notice says so. Only test values are used; the account itself is not changed.

BEGIN;

DO $$
DECLARE
  v_user uuid;
  v_result jsonb;
BEGIN
  SELECT u.id INTO v_user
  FROM auth.users u
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
  ORDER BY u.created_at DESC
  LIMIT 1;

  IF v_user IS NULL THEN
    RAISE NOTICE 'No sign-up without a profile was found, so there is nothing to test.';
    RETURN;
  END IF;

  v_result := public.provision_host_business(
    v_user, 'Diagnosis Owner', 'male', DATE '1990-01-01', 'HOST-CF-0000-DIAG', ARRAY['cafe', 'restaurant', 'hotel'],
    'Diagnosis Venue', 'diagnosis-venue-' || substr(md5(random()::text), 1, 6), 'Diagnosis address line',
    'Manali', 'Himachal Pradesh', '175131', 'qr_diag_' || substr(md5(random()::text), 1, 8), NULL
  );
  RAISE NOTICE 'The set-up would succeed: %', v_result;
END $$;

ROLLBACK;
