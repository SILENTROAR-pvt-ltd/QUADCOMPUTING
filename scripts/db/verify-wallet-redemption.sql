-- Read-only checks for the wallet redeem pipeline. Run after applying
-- supabase/migrations/20261009000001_wallet_code_and_redemption_guards.sql.
-- Each query returns rows only when something is wrong, except the first two
-- summaries, which should read the values noted in the comments.

-- 1. Every wallet has a code, and codes are unique. Expect: 0 rows.
SELECT 'wallet_code missing or duplicated' AS check_name, count(*) AS problems
FROM (
    SELECT id FROM public.guest_wallets WHERE wallet_code IS NULL OR btrim(wallet_code) = ''
    UNION ALL
    SELECT id FROM public.guest_wallets gw
    WHERE (SELECT count(*) FROM public.guest_wallets x WHERE x.wallet_code = gw.wallet_code) > 1
) q;

-- 2. The settlement function carries the new guards and billing/replay support. Expect: 6 rows of 'present'.
SELECT guard, CASE WHEN position(guard in pg_get_functiondef('public.execute_atomic_bill_settlement'::regproc)) > 0
                   THEN 'present' ELSE 'MISSING' END AS state
FROM (VALUES ('REDEMPTION_NOT_USABLE'), ('REDEMPTION_EXPIRED'), ('REDEMPTION_EXCEEDS_CODE'), ('WALLET_NOT_FOUND'),
             ('p_billing'), ('redemption_replayed')) g(guard);

-- 2a. Cashback is on the full bill: the function must NOT subtract the discount from the base.
-- Expect: 'full bill (before discount)'. If it says 'discount still subtracted', apply
-- 20261009000003_cashback_on_full_bill.sql.
SELECT CASE WHEN position('- COALESCE(p_discount_amount, 0)' in pg_get_functiondef('public.execute_atomic_bill_settlement'::regproc)) = 0
            THEN 'full bill (before discount)' ELSE 'discount still subtracted' END AS cashback_base;

-- 2b. Exactly one settlement function exists (the 11-argument version was dropped). Expect: 1.
SELECT count(*) AS settlement_overloads
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'execute_atomic_bill_settlement';

-- 3. Ledger: each wallet balance equals its signed transaction sum. Expect: 0 rows.
SELECT gw.id, gw.wallet_code, gw.balance,
       coalesce(sum(CASE WHEN wt.transaction_type = 'REDEMPTION' THEN -wt.amount ELSE wt.amount END), 0) AS ledger_sum
FROM public.guest_wallets gw
LEFT JOIN public.wallet_transactions wt ON wt.wallet_id = gw.id
GROUP BY gw.id, gw.wallet_code, gw.balance
HAVING round(gw.balance, 2) <> round(coalesce(sum(CASE WHEN wt.transaction_type = 'REDEMPTION' THEN -wt.amount ELSE wt.amount END), 0), 2);

-- 4. Every redeemed code has exactly one REDEMPTION debit of the amount it applied. Expect: 0 rows.
SELECT wr.code, wr.applied_amount, wr.order_id
FROM public.wallet_redemptions wr
WHERE wr.status = 'redeemed'
  AND NOT EXISTS (
        SELECT 1 FROM public.wallet_transactions wt
        WHERE wt.transaction_type = 'REDEMPTION'
          AND wt.order_id IS NOT DISTINCT FROM wr.order_id
          AND round(wt.amount, 2) = round(coalesce(wr.applied_amount, wr.amount), 2)
  );

-- 5. Codes that are still open but past their expiry (the app retires them on next use). Informational.
SELECT code, status, expires_at
FROM public.wallet_redemptions
WHERE status IN ('pending', 'verified') AND expires_at <= now();
