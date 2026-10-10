-- Add Master Admin PIN to businesses for full RBAC security
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS admin_pin text DEFAULT '0000';
