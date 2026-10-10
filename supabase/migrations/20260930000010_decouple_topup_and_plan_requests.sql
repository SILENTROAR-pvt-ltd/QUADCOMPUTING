-- Migration: Decouple Wallet Top-Ups from Plan Subscriptions
-- Adds request_type column to venue_topup_requests with values: 'wallet_topup' | 'plan_subscription'

ALTER TABLE public.venue_topup_requests 
ADD COLUMN IF NOT EXISTS request_type TEXT NOT NULL DEFAULT 'wallet_topup';

CREATE INDEX IF NOT EXISTS idx_venue_topup_requests_type ON public.venue_topup_requests(request_type);

-- Backfill existing rows that have requested_plan_tier
UPDATE public.venue_topup_requests
SET request_type = 'plan_subscription'
WHERE requested_plan_tier IS NOT NULL 
  AND requested_plan_tier != 'pay_as_you_go'
  AND request_type = 'wallet_topup';
