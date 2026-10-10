ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS email text,
    ADD COLUMN IF NOT EXISTS ecosystem_statement text,
    ADD COLUMN IF NOT EXISTS categories_handled text[];

ALTER TABLE public.businesses
    ADD COLUMN IF NOT EXISTS business_name text;

UPDATE public.businesses AS business
SET business_name = location.branch_name
FROM (
    SELECT DISTINCT ON (business_id) business_id, branch_name
    FROM public.locations
    ORDER BY business_id, created_at DESC
) AS location
WHERE business.id = location.business_id
  AND business.business_name IS NULL;