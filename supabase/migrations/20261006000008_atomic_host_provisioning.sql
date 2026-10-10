-- ============================================================================
-- 20261006000008_atomic_host_provisioning.sql
--
-- app/api/host/provision/route.ts used to insert profiles/businesses/
-- locations/venue_wallets/venue_subscriptions as five separate calls, each
-- wrapped in its own try/catch that only logged a warning on failure. The
-- route always returned success:true regardless, with a businessId that was
-- generated before any insert ran — so a failed provisioning left the host
-- stranded on a dashboard for a business that was never actually created,
-- with no error surfaced anywhere.
--
-- This RPC wraps one business's full provisioning in a single transaction:
-- any failure (e.g. p_host_id not being a real auth.users row) rolls back
-- everything and returns a real error for the route to propagate.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.provision_host_business(
    p_host_id uuid,
    p_full_name text,
    p_gender text,
    p_dob date,
    p_owner_cafe_id text,
    p_categories text[],
    p_business_name text,
    p_slug text,
    p_address text,
    p_city text,
    p_state text,
    p_pincode text,
    p_qr_code_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_business_id uuid := gen_random_uuid();
    v_location_id uuid := gen_random_uuid();
BEGIN
    SET LOCAL statement_timeout = '5000ms';
    SET LOCAL lock_timeout = '3000ms';

    IF p_host_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'HOST_ID_REQUIRED');
    END IF;
    IF p_business_name IS NULL OR trim(p_business_name) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'BUSINESS_NAME_REQUIRED');
    END IF;

    -- 1. Upsert host profile. Fails loudly (FK violation) if p_host_id is not
    -- a real auth.users row — this is the exact failure that was previously
    -- silently swallowed.
    INSERT INTO public.profiles (id, role, full_name, gender, dob, owner_cafe_id)
    VALUES (p_host_id, 'host', p_full_name, p_gender, p_dob, p_owner_cafe_id)
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        gender = EXCLUDED.gender,
        dob = EXCLUDED.dob,
        owner_cafe_id = COALESCE(public.profiles.owner_cafe_id, EXCLUDED.owner_cafe_id);

    -- 2. Business
    INSERT INTO public.businesses (id, host_id, business_name, name, slug, categories)
    VALUES (v_business_id, p_host_id, p_business_name, p_business_name, p_slug, p_categories);

    -- 3. Location (now also persists pincode, which the route validated but never saved)
    INSERT INTO public.locations (id, business_id, branch_name, address, city, state, pincode, qr_code_hash)
    VALUES (v_location_id, v_business_id, p_business_name, p_address, p_city, p_state, p_pincode, p_qr_code_hash);

    -- 4. Wallet & subscription
    INSERT INTO public.venue_wallets (venue_id, balance)
    VALUES (v_business_id, 1000.00)
    ON CONFLICT (venue_id) DO NOTHING;

    INSERT INTO public.venue_subscriptions (venue_id, plan_tier, status)
    VALUES (v_business_id, 'pay_as_you_go', 'active')
    ON CONFLICT (venue_id) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'business_id', v_business_id,
        'location_id', v_location_id
    );
END;
$$;

DO $$ BEGIN
    REVOKE EXECUTE ON FUNCTION public.provision_host_business(
        uuid, text, text, date, text, text[], text, text, text, text, text, text, text
    ) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.provision_host_business(
        uuid, text, text, date, text, text[], text, text, text, text, text, text, text
    ) TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
