-- Vibers Club, part 4: the escrow-style double-entry ledger, payments, payouts, webhooks and NOCs.
--
-- Every money movement is one journal (club_journal) with balanced lines (escrow_ledger), posted by
-- club_post_journal() in a single transaction:
--   * debits equal credits, both positive, at least two lines;
--   * the same idempotency key always returns the same journal (no double posting);
--   * liability accounts (event escrow, vendor payables) can never go below zero, checked under a
--     row lock so two payouts cannot spend the same money.
-- Journals and lines are immutable. Amounts are integer paise. Server-only. Idempotent.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.club_events') IS NULL OR to_regclass('public.club_agreements') IS NULL THEN
        RAISE EXCEPTION 'Run Club migrations 20261011000001, 20261011000002 and 20261011000003 first (or paste supabase/club_setup_all.sql, which runs all four in order).';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.club_ledger_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    kind text NOT NULL CHECK (kind IN ('platform_cash', 'event_escrow', 'vendor_payable', 'club_revenue')),
    event_id uuid REFERENCES public.club_events(id) ON DELETE RESTRICT,
    property_id uuid REFERENCES public.property_marketplace(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.club_journal (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key text NOT NULL UNIQUE,
    kind text NOT NULL,
    event_id uuid REFERENCES public.club_events(id) ON DELETE RESTRICT,
    memo text,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_journal_event ON public.club_journal (event_id, created_at);

CREATE TABLE IF NOT EXISTS public.escrow_ledger (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_id uuid NOT NULL REFERENCES public.club_journal(id) ON DELETE RESTRICT,
    account_id uuid NOT NULL REFERENCES public.club_ledger_accounts(id) ON DELETE RESTRICT,
    debit bigint NOT NULL DEFAULT 0,
    credit bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT escrow_ledger_one_side CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);
CREATE INDEX IF NOT EXISTS idx_escrow_ledger_account ON public.escrow_ledger (account_id);
CREATE INDEX IF NOT EXISTS idx_escrow_ledger_journal ON public.escrow_ledger (journal_id);

CREATE OR REPLACE FUNCTION public.club_ledger_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'The ledger is append-only: post a reversing journal instead' USING ERRCODE = 'check_violation';
END $$;
DROP TRIGGER IF EXISTS trg_escrow_ledger_immutable ON public.escrow_ledger;
CREATE TRIGGER trg_escrow_ledger_immutable BEFORE UPDATE OR DELETE ON public.escrow_ledger
    FOR EACH ROW EXECUTE FUNCTION public.club_ledger_immutable();
DROP TRIGGER IF EXISTS trg_club_journal_immutable ON public.club_journal;
CREATE TRIGGER trg_club_journal_immutable BEFORE UPDATE OR DELETE ON public.club_journal
    FOR EACH ROW EXECUTE FUNCTION public.club_ledger_immutable();

CREATE OR REPLACE FUNCTION public.club_post_journal(
    p_key text, p_kind text, p_event uuid, p_memo text, p_actor uuid, p_lines jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_id uuid;
    v_lines integer;
    v_dr bigint;
    v_cr bigint;
    v_bad text;
BEGIN
    SELECT id INTO v_id FROM club_journal WHERE idempotency_key = p_key;
    IF FOUND THEN RETURN v_id; END IF;

    SELECT count(*), coalesce(sum(coalesce((l->>'debit')::bigint, 0)), 0), coalesce(sum(coalesce((l->>'credit')::bigint, 0)), 0)
      INTO v_lines, v_dr, v_cr FROM jsonb_array_elements(p_lines) l;
    IF v_lines < 2 OR v_dr <> v_cr OR v_dr <= 0 THEN
        RAISE EXCEPTION 'Unbalanced journal (% lines, debit %, credit %)', v_lines, v_dr, v_cr USING ERRCODE = 'check_violation';
    END IF;

    -- Lock the accounts this journal touches, in a stable order, before checking balances.
    PERFORM 1 FROM club_ledger_accounts
      WHERE id IN (SELECT (l->>'account_id')::uuid FROM jsonb_array_elements(p_lines) l)
      ORDER BY id FOR UPDATE;

    INSERT INTO club_journal (idempotency_key, kind, event_id, memo, created_by)
        VALUES (p_key, p_kind, p_event, p_memo, p_actor) RETURNING id INTO v_id;
    INSERT INTO escrow_ledger (journal_id, account_id, debit, credit)
        SELECT v_id, (l->>'account_id')::uuid, coalesce((l->>'debit')::bigint, 0), coalesce((l->>'credit')::bigint, 0)
        FROM jsonb_array_elements(p_lines) l;

    SELECT a.code INTO v_bad FROM club_ledger_accounts a JOIN escrow_ledger e ON e.account_id = a.id
      WHERE a.kind IN ('event_escrow', 'vendor_payable')
        AND a.id IN (SELECT (l->>'account_id')::uuid FROM jsonb_array_elements(p_lines) l)
      GROUP BY a.code HAVING sum(e.credit) - sum(e.debit) < 0 LIMIT 1;
    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'Insufficient funds in %', v_bad USING ERRCODE = 'check_violation';
    END IF;
    RETURN v_id;
EXCEPTION WHEN unique_violation THEN
    SELECT id INTO v_id FROM club_journal WHERE idempotency_key = p_key;
    RETURN v_id;
END $$;

CREATE OR REPLACE VIEW public.club_account_balances WITH (security_invoker = true) AS
    SELECT a.id, a.code, a.kind, a.event_id, a.property_id,
           coalesce(sum(e.debit), 0)::bigint AS debits, coalesce(sum(e.credit), 0)::bigint AS credits
    FROM public.club_ledger_accounts a LEFT JOIN public.escrow_ledger e ON e.account_id = a.id
    GROUP BY a.id;

CREATE TABLE IF NOT EXISTS public.club_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.club_events(id) ON DELETE RESTRICT,
    agreement_id uuid REFERENCES public.club_agreements(id) ON DELETE RESTRICT,
    payer_id uuid NOT NULL REFERENCES public.viber_profiles(user_id) ON DELETE RESTRICT,
    purpose text NOT NULL CHECK (purpose IN ('deposit', 'participant')),
    installment integer NOT NULL DEFAULT 1,
    label text NOT NULL,
    amount bigint NOT NULL CHECK (amount > 0),
    currency text NOT NULL DEFAULT 'INR',
    status text NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'captured', 'failed')),
    gateway text NOT NULL DEFAULT 'razorpay',
    gateway_order_id text UNIQUE,
    gateway_payment_id text UNIQUE,
    idempotency_key text NOT NULL UNIQUE,
    journal_id uuid REFERENCES public.club_journal(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    captured_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_club_payments_event ON public.club_payments (event_id, status);

CREATE TABLE IF NOT EXISTS public.club_webhook_events (
    id text PRIMARY KEY,
    kind text NOT NULL,
    received_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.club_payouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.club_events(id) ON DELETE RESTRICT,
    property_id uuid REFERENCES public.property_marketplace(id) ON DELETE RESTRICT,
    payee_label text NOT NULL,
    third_party boolean NOT NULL DEFAULT false,
    amount bigint NOT NULL CHECK (amount > 0),
    status text NOT NULL DEFAULT 'pending_approval'
        CHECK (status IN ('pending_approval', 'approved', 'paid', 'rejected', 'failed')),
    provider text NOT NULL DEFAULT 'manual',
    idempotency_key text NOT NULL UNIQUE,
    approved_by uuid,
    approved_at timestamptz,
    allocate_journal_id uuid REFERENCES public.club_journal(id),
    paid_reference text,
    paid_at timestamptz,
    payout_journal_id uuid REFERENCES public.club_journal(id),
    attempts integer NOT NULL DEFAULT 0,
    last_error text,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_payouts_event ON public.club_payouts (event_id, status);

CREATE TABLE IF NOT EXISTS public.club_nocs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL UNIQUE REFERENCES public.club_events(id) ON DELETE RESTRICT,
    code text NOT NULL UNIQUE,
    payload jsonb NOT NULL,
    signature text NOT NULL,
    issued_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['club_ledger_accounts', 'club_journal', 'escrow_ledger', 'club_payments',
        'club_webhook_events', 'club_payouts', 'club_nocs'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    END LOOP;
END $$;
REVOKE ALL ON public.club_account_balances FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.club_post_journal(text, text, uuid, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.club_post_journal(text, text, uuid, text, uuid, jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.club_ledger_immutable() FROM PUBLIC, anon, authenticated;

COMMIT;
