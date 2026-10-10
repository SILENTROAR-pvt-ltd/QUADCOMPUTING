-- ============================================================================
-- 20261008000007_guest_accounts.sql   (safe to re-run)
--
-- Guest sign-in. A guest account is a handle (the wallet key) plus a 6-digit
-- PIN stored only as a salted scrypt hash. Signing in creates a server-side
-- session; the browser only ever holds an opaque token in an httpOnly cookie
-- (stored here as a SHA-256 hash). Both tables are service-role only.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.guest_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    handle text NOT NULL,
    display_name text NOT NULL,
    phone text,
    avatar text NOT NULL DEFAULT '☕',
    pin_hash text NOT NULL,
    pin_salt text NOT NULL,
    failed_attempts integer NOT NULL DEFAULT 0,
    locked_until timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_login_at timestamptz,
    CONSTRAINT guest_accounts_handle_format CHECK (handle ~ '^@[a-z0-9_]{2,30}$'),
    CONSTRAINT guest_accounts_unique_handle UNIQUE (business_id, handle)
);

CREATE TABLE IF NOT EXISTS public.guest_auth_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid NOT NULL REFERENCES public.guest_accounts(id) ON DELETE CASCADE,
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guest_auth_sessions_account ON public.guest_auth_sessions (account_id);
CREATE INDEX IF NOT EXISTS idx_guest_auth_sessions_expires ON public.guest_auth_sessions (expires_at);

ALTER TABLE public.guest_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_auth_sessions ENABLE ROW LEVEL SECURITY;

-- No client role may touch these: the app reads and writes them with the service role only.
REVOKE ALL ON public.guest_accounts, public.guest_auth_sessions FROM anon, authenticated;

COMMIT;
