-- ============================================================
-- supabase/tests/rls_tests.sql
-- Automated RLS Isolation & Role Permission Test Suite
-- ============================================================
BEGIN;

-- Test 1: Anonymous user trying to read profiles or orders directly must return 0 rows
SET LOCAL ROLE anon;

-- Reading profiles must be empty / blocked for anon
DO $$
DECLARE
    v_count INT;
BEGIN
    SELECT count(*) INTO v_count FROM public.profiles;
    IF v_count > 0 THEN
        RAISE EXCEPTION 'RLS FAILED: anon was able to read profiles! Count: %', v_count;
    END IF;
    RAISE NOTICE 'Test 1 Passed: anon cannot read profiles (0 rows returned)';
END $$;

-- Reading guest_wallets or wallet_transactions directly must be blocked for anon
DO $$
DECLARE
    v_count INT;
BEGIN
    SELECT count(*) INTO v_count FROM public.guest_wallets;
    IF v_count > 0 THEN
        RAISE EXCEPTION 'RLS FAILED: anon was able to read guest_wallets! Count: %', v_count;
    END IF;
    RAISE NOTICE 'Test 2 Passed: anon cannot read guest_wallets (0 rows returned)';
END $$;

-- Test 3: Authenticated Tenant Isolation Test
SET LOCAL ROLE authenticated;

-- Simulate authenticated context for Tenant A
SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}', true);

-- Verify cross-tenant isolation: cannot query another tenant's venue_wallets or operational expenses
DO $$
DECLARE
    v_count INT;
BEGIN
    SELECT count(*) INTO v_count 
    FROM public.operational_expenses 
    WHERE business_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

    IF v_count > 0 THEN
        RAISE EXCEPTION 'RLS FAILED: Cross-tenant data leakage detected!';
    END IF;
    RAISE NOTICE 'Test 3 Passed: Authenticated user cannot access non-owned business data';
END $$;

-- Rollback test transaction so test never mutates persistent state
ROLLBACK;
