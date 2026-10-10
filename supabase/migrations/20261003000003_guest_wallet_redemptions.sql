-- Migration: Guest Wallet Redemptions & Host Verification Pipeline
CREATE TABLE IF NOT EXISTS public.wallet_redemptions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    wallet_id uuid REFERENCES public.guest_wallets(id) ON DELETE CASCADE,
    guest_id text NOT NULL,
    guest_handle text,
    guest_phone text,
    business_id text NOT NULL,
    cafe_id text NOT NULL,
    table_number text,
    amount numeric NOT NULL CHECK (amount > 0),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'redeemed', 'cancelled', 'expired')),
    verified_at timestamp with time zone,
    redeemed_at timestamp with time zone,
    order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    expires_at timestamp with time zone DEFAULT (now() + interval '60 minutes'),
    CONSTRAINT wallet_redemptions_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_wallet_redemptions_code ON public.wallet_redemptions(code);
CREATE INDEX IF NOT EXISTS idx_wallet_redemptions_cafe_status ON public.wallet_redemptions(cafe_id, status);
CREATE INDEX IF NOT EXISTS idx_wallet_redemptions_guest ON public.wallet_redemptions(guest_id, status);
CREATE INDEX IF NOT EXISTS idx_wallet_redemptions_table ON public.wallet_redemptions(table_number, cafe_id);
