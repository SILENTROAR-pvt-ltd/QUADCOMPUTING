-- One account for guests and hosts.
--
-- Guests now sign in with the same Supabase account (email + password) as hosts. Each person has one
-- Vibers profile (a platform-wide @handle, name, phone). Properties still keep their own guest record
-- and wallet: a guest_accounts row per property, now linked to the person through user_id, and the
-- per-property wallet is still keyed by the same @handle. Old @handle + PIN accounts are linked when
-- their owner proves the old PIN once; those rows keep their PIN, new rows have none.
-- Idempotent: safe to run more than once.

CREATE TABLE IF NOT EXISTS public.vibers_accounts (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    handle text NOT NULL,
    display_name text NOT NULL,
    phone text,
    avatar text NOT NULL DEFAULT '☕',
    traveller_type text,
    intro text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT vibers_accounts_handle_format CHECK (handle ~ '^@[a-z0-9_]{2,30}$'),
    CONSTRAINT vibers_accounts_unique_handle UNIQUE (handle)
);

-- Only the server (service role) reads and writes this table; the browser never does.
ALTER TABLE public.vibers_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vibers_accounts FROM anon, authenticated;

-- Each property's guest record points at the person it belongs to.
ALTER TABLE public.guest_accounts ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_guest_accounts_venue_user
    ON public.guest_accounts (business_id, user_id) WHERE user_id IS NOT NULL;

-- Records created for a signed-in person have no PIN: they sign in with their account password.
ALTER TABLE public.guest_accounts ALTER COLUMN pin_hash DROP NOT NULL;
ALTER TABLE public.guest_accounts ALTER COLUMN pin_salt DROP NOT NULL;
