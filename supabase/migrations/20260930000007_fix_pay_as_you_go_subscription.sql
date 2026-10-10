-- ============================================================
-- MIGRATION: Ensure Pay-As-You-Go is never marked as trial
-- ============================================================

-- 1. Alter default status and trial_ends_at for venue_subscriptions
-- Pay-As-You-Go is active by default with no trial period
ALTER TABLE public.venue_subscriptions 
    ALTER COLUMN status SET DEFAULT 'active',
    ALTER COLUMN trial_ends_at DROP DEFAULT;

-- 2. Clear trial_ends_at and set status='active' for any venue on pay_as_you_go
UPDATE public.venue_subscriptions
SET 
    status = 'active',
    trial_ends_at = NULL,
    expires_at = NULL
WHERE plan_tier = 'pay_as_you_go';
