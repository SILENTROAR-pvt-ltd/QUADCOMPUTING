-- ============================================================
-- MIGRATION: Businesses Schema Alignment & PostgREST Cache Reload
-- ============================================================

-- 1. Ensure businesses table has business_name and email columns
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Populate business_name from locations if null
UPDATE public.businesses AS b
SET business_name = l.branch_name
FROM (
    SELECT DISTINCT ON (business_id) business_id, branch_name
    FROM public.locations
    ORDER BY business_id, created_at DESC
) AS l
WHERE b.id = l.business_id
  AND (b.business_name IS NULL OR b.business_name = '');

-- 3. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
