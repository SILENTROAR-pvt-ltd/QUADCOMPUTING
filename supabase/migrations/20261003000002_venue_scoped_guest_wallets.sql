-- Migration: Add venue/cafe scoping to guest_wallets and wallet_transactions
ALTER TABLE public.guest_wallets
  ADD COLUMN IF NOT EXISTS cafe_id text,
  ADD COLUMN IF NOT EXISTS cafe_name text;

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS cafe_id text,
  ADD COLUMN IF NOT EXISTS cafe_name text,
  ADD COLUMN IF NOT EXISTS table_number text;

CREATE INDEX IF NOT EXISTS idx_guest_wallets_cafe_lookup ON public.guest_wallets(guest_id, cafe_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_cafe ON public.wallet_transactions(cafe_id);
