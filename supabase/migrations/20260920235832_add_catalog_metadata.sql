ALTER TABLE public.catalog_items 
ADD COLUMN IF NOT EXISTS metadata JSONB;
