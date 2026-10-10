-- Migration: 20261006000002_add_business_name_compatibility.sql
-- Description: Ensure backward and forward compatibility between 'name' and 'business_name' on businesses table

ALTER TABLE IF EXISTS public.businesses 
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS business_name TEXT;

-- Backfill missing values between name and business_name
UPDATE public.businesses
SET name = COALESCE(name, business_name, 'Venue'),
    business_name = COALESCE(business_name, name, 'Venue')
WHERE name IS NULL OR business_name IS NULL;
