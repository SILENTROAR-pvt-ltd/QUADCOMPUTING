-- Add staff_pin column to businesses table for POS Quick-Unlock
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS staff_pin text;
