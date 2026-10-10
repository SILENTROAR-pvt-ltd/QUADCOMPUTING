-- ============================================================================
-- 20261006000009_provision_slug_collision_handling.sql
--
-- provision_host_business (20261006000008) let a businesses.slug collision
-- (uq_businesses_slug) bubble up as a raw constraint-violation error and
-- abort the whole signup — hit in real testing when two venues produced the
-- same slug (e.g. two businesses both named "Bombay Rasoi"). slug is also
-- used for guest-facing venue lookup (business-resolver.service.ts), so it
-- must stay both unique and human-readable — not replaced with a random
-- suffix on every insert. This redefines the RPC to retry with a short,
-- readable disambiguating suffix (-2, -3, ...) only when the base slug is
-- actually taken.
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
    v_base_slug text := NULLIF(trim(p_slug), '');
    v_candidate_slug text;
    v_attempt int := 0;
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
    -- a real auth.users row — this is the exact failure that used to be
    -- silently swallowed.
    INSERT INTO public.profiles (id, role, full_name, gender, dob, owner_cafe_id)
    VALUES (p_host_id, 'host', p_full_name, p_gender, p_dob, p_owner_cafe_id)
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        gender = EXCLUDED.gender,
        dob = EXCLUDED.dob,
        owner_cafe_id = COALESCE(public.profiles.owner_cafe_id, EXCLUDED.owner_cafe_id);

    -- 2. Business — retry with a numbered suffix on a slug collision only.
    -- (Table has no unique constraint on business_name itself, only slug.)
    IF v_base_slug IS NULL THEN
        v_base_slug := 'venue-' || substr(v_business_id::text, 1, 8);
    END IF;
    v_candidate_slug := v_base_slug;

    LOOP
        BEGIN
            INSERT INTO public.businesses (id, host_id, business_name, name, slug, categories)
            VALUES (v_business_id, p_host_id, p_business_name, p_business_name, v_candidate_slug, p_categories);
            EXIT;
        EXCEPTION WHEN unique_violation THEN
            v_attempt := v_attempt + 1;
            IF v_attempt > 20 THEN
                RAISE EXCEPTION 'Could not find a unique slug for "%" after % attempts', p_business_name, v_attempt;
            END IF;
            v_candidate_slug := v_base_slug || '-' || (v_attempt + 1)::text;
        END;
    END LOOP;

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
        'location_id', v_location_id,
        'slug', v_candidate_slug
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
