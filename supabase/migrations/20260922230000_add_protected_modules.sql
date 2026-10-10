-- Add protected_modules column to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS protected_modules JSONB DEFAULT '{"dashboard": true, "profile": true, "catalog": true, "inventory": true, "expenses": true}'::jsonb;
