-- Append-only record of changes to a venue's configuration: business settings (GST, PIN status), staff access and the
-- menu price list. Written by triggers only; no client role can change or remove a row. Hand-apply in staging first,
-- after 20261021000001_security_remediation.sql. Re-running is safe.

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Nullable so a row with no venue still records. The insert is NOT wrapped in an exception handler on purpose: if it
    -- fails, the venue change fails with it. An unaudited change must not commit, and a dropped row is worse than a retry.
    business_id uuid,
    actor_id uuid,
    action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    table_name text NOT NULL,
    record_id text,
    old_data jsonb,
    new_data jsonb,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_business_created_idx
    ON public.admin_audit_logs (business_id, created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- A host reads the trail of venues they own. The super admin (app_metadata role, as in middleware.ts) reads all of it.
DROP POLICY IF EXISTS "Hosts and super admins read the audit trail" ON public.admin_audit_logs;
CREATE POLICY "Hosts and super admins read the audit trail" ON public.admin_audit_logs
    FOR SELECT TO authenticated
    USING (
        business_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid())
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    );

-- Append-only: triggers insert as the function owner. Nobody else writes, changes or removes a row, service_role included.
REVOKE ALL ON public.admin_audit_logs FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.admin_audit_logs TO authenticated;

CREATE OR REPLACE FUNCTION public.log_admin_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    -- Field access goes through jsonb, so the same code runs for INSERT, UPDATE and DELETE.
    v_row jsonb := to_jsonb(CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END);
    v_old jsonb := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END;
    v_new jsonb := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END;
BEGIN
    -- Secrets never enter the log: PIN columns (hashed and legacy plain-text) are removed from both snapshots.
    -- Legacy plain-text columns still exist on the audited tables (businesses.staff_pin, staff_profiles.pin_code).
    v_old := v_old - ARRAY['admin_pin', 'admin_pin_hash', 'staff_pin', 'staff_pin_hash', 'pin_code', 'pin_hash'];
    v_new := v_new - ARRAY['admin_pin', 'admin_pin_hash', 'staff_pin', 'staff_pin_hash', 'pin_code', 'pin_hash'];

    INSERT INTO public.admin_audit_logs (business_id, actor_id, action, table_name, record_id, old_data, new_data)
    VALUES (
        CASE WHEN TG_TABLE_NAME = 'businesses' THEN (v_row ->> 'id')::uuid ELSE (v_row ->> 'business_id')::uuid END,
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        v_row ->> 'id',
        v_old,
        v_new
    );
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_businesses ON public.businesses;
CREATE TRIGGER audit_businesses
    AFTER INSERT OR UPDATE OR DELETE ON public.businesses
    FOR EACH ROW EXECUTE FUNCTION public.log_admin_mutation();

DROP TRIGGER IF EXISTS audit_staff_profiles ON public.staff_profiles;
CREATE TRIGGER audit_staff_profiles
    AFTER INSERT OR UPDATE OR DELETE ON public.staff_profiles
    FOR EACH ROW EXECUTE FUNCTION public.log_admin_mutation();

DROP TRIGGER IF EXISTS audit_catalog_items ON public.catalog_items;
CREATE TRIGGER audit_catalog_items
    AFTER INSERT OR UPDATE OR DELETE ON public.catalog_items
    FOR EACH ROW EXECUTE FUNCTION public.log_admin_mutation();
