-- ============================================================
-- MIGRATION: Extend Staff Profiles for POS Quick-PIN Auth
-- Adds pin_code and roles to staff, links orders to staff
-- ============================================================

-- 1. Add pin_code, pos_access, and role to existing staff_profiles table
ALTER TABLE public.staff_profiles
ADD COLUMN IF NOT EXISTS pin_code text,
ADD COLUMN IF NOT EXISTS is_pos_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS role text DEFAULT 'CASHIER';

-- 2. Link served staff to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS served_by_staff_id uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS staff_name text;
