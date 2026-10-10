-- Ensure staff_pin exists alongside admin_pin
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS staff_pin text;
