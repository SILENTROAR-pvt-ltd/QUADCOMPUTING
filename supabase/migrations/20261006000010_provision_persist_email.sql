-- ============================================================================
-- 20261006000010_provision_persist_email.sql
--
-- provision_host_business never persisted the signup email to profiles.email
-- (or businesses.email) — it only set id/role/full_name/gender/dob. Every
-- freshly provisioned host therefore had a NULL profile email, which made
-- the client fall back to stale cached state and (before the
-- useProfileHydration / host-workspace.store fixes in this same change set)
-- could surface a *different* host's leftover email from the browser's
-- cached workspace. This closes the gap at the source: a fresh host now has
-- their own real email from the moment they're provisioned.
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
    p_qr_code_hash text,
    p_email text DEFAULT NULL
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

    INSERT INTO public.profiles (id, role, full_name, gender, dob, owner_cafe_id, email)
    VALUES (p_host_id, 'host', p_full_name, p_gender, p_dob, p_owner_cafe_id, p_email)
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        gender = EXCLUDED.gender,
        dob = EXCLUDED.dob,
        owner_cafe_id = COALESCE(public.profiles.owner_cafe_id, EXCLUDED.owner_cafe_id),
        email = COALESCE(public.profiles.email, EXCLUDED.email);

    IF v_base_slug IS NULL THEN
        v_base_slug := 'venue-' || substr(v_business_id::text, 1, 8);
    END IF;
    v_candidate_slug := v_base_slug;

    LOOP
        BEGIN
            INSERT INTO public.businesses (id, host_id, business_name, name, slug, categories, email)
            VALUES (v_business_id, p_host_id, p_business_name, p_business_name, v_candidate_slug, p_categories, p_email);
            EXIT;
        EXCEPTION WHEN unique_violation THEN
            v_attempt := v_attempt + 1;
            IF v_attempt > 20 THEN
                RAISE EXCEPTION 'Could not find a unique slug for "%" after % attempts', p_business_name, v_attempt;
            END IF;
            v_candidate_slug := v_base_slug || '-' || (v_attempt + 1)::text;
        END;
    END LOOP;

    INSERT INTO public.locations (id, business_id, branch_name, address, city, state, pincode, qr_code_hash)
    VALUES (v_location_id, v_business_id, p_business_name, p_address, p_city, p_state, p_pincode, p_qr_code_hash);

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
        uuid, text, text, date, text, text[], text, text, text, text, text, text, text, text
    ) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.provision_host_business(
        uuid, text, text, date, text, text[], text, text, text, text, text, text, text, text
    ) TO authenticated, service_role;
    -- The previous 13-arg signature (without p_email) is superseded — drop it
    -- so there isn't a stale overload left behind for callers to hit by accident.
    DROP FUNCTION IF EXISTS public.provision_host_business(
        uuid, text, text, date, text, text[], text, text, text, text, text, text, text
    );
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
