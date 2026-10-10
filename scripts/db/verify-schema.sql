-- ============================================================================
-- verify-schema.sql — READ-ONLY. Paste into the Supabase SQL editor and run.
--
-- Lists every database object the application depends on that is missing or misconfigured.
-- An EMPTY result means the database matches what the code expects. Nothing is modified.
-- Re-run after applying migrations until it returns no rows.
-- ============================================================================

WITH expected_columns(tbl, col, used_by) AS (VALUES
  -- wallets / redemptions / claims
  ('guest_wallet_claims',    'guest_key',          'wallet ownership (migration 20261008000002)'),
  ('guest_wallet_claims',    'secret_hash',        'wallet ownership (migration 20261008000002)'),
  ('guest_wallets',          'guest_id',           'guest wallet lookup'),
  ('guest_wallets',          'cafe_id',            'guest wallet lookup'),
  ('wallet_redemptions',     'expires_at',         'redemption expiry'),
  ('wallet_redemptions',     'business_id',        'redemption venue scoping'),
  ('wallet_transactions',    'idempotency_key',    'settlement ledger idempotency'),
  -- lobby (migration 20261008000003)
  ('lobby_messages',         'business_id',        'lobby venue scoping'),
  ('table_invitations',      'business_id',        'lobby venue scoping'),
  ('private_chats',          'business_id',        'lobby venue scoping'),
  ('private_chat_messages',  'chat_id',            'lobby private chat'),
  ('guest_sessions',         'customer_id',        'guest onboarding'),
  ('guest_sessions',         'cafe_id',            'guest onboarding'),
  -- billing / fees
  ('venue_wallets',          'venue_id',           'billing guard'),
  ('venue_subscriptions',    'venue_id',           'billing guard'),
  ('venue_outstanding_bills','reference_id',       'fee idempotency'),
  ('usage_ledger',           'balance_after',      'wallet deduction function (migration 20261008000004)'),
  ('staff_notifications',    'message',            'low-balance alert (migration 20261008000004)'),
  ('venue_topup_requests',   'utr_number',         'top-up requests'),
  -- orders / rooms / sessions
  ('orders',                 'idempotency_key',    'guest order de-duplication'),
  ('orders',                 'master_order_id',    'room checkout'),
  ('orders',                 'room_id',            'room checkout'),
  ('orders',                 'order_type',         'room checkout'),
  ('rooms',                  'check_in_time',      'room checkout'),
  ('room_stay_logs',         'total_billed_amount','room checkout'),
  ('dine_in_sessions',       'guest_handle',       'bill settlement'),
  ('recipe_ingredients',     'business_id',        'stock deduction'),
  ('businesses',             'slug',               'venue resolution'),
  ('businesses',             'host_id',            'host authorization')
),
expected_functions(fn, used_by) AS (VALUES
  ('submit_guest_order_atomic',        'guest ordering (order + KOT + session in one transaction)'),
  ('execute_atomic_bill_settlement',   'table bill settlement, cashback, redemption'),
  ('update_kot_status',                'kitchen status changes'),
  ('approve_topup_request',            'admin top-up approval'),
  ('deduct_venue_wallet_credits',      'platform fee deduction'),
  ('deduct_inventory_stock',           'stock deduction on order completion'),
  ('deduct_recipe_inventory_for_order','stock deduction on POS orders'),
  ('provision_host_business',          'host onboarding'),
  ('generate_daily_z_report',          'Z-report')
),
expected_indexes(idx, used_by) AS (VALUES
  ('uq_topup_utr',                    'one top-up per payment reference (migration 20261008000004)'),
  ('uq_pending_redemption_per_guest', 'one pending redemption per guest (migration 20261008000004)')
),
rls_tables(tbl) AS (VALUES
  ('guest_wallet_claims'), ('lobby_messages'), ('table_invitations'), ('private_chats'),
  ('private_chat_messages'), ('guest_sessions'), ('guest_wallets'), ('wallet_transactions'),
  ('wallet_redemptions'), ('venue_wallets'), ('venue_subscriptions'), ('venue_topup_requests'),
  ('orders'), ('businesses')
)

SELECT 'missing table' AS problem, e.tbl AS object, string_agg(DISTINCT e.used_by, '; ') AS needed_for
FROM expected_columns e
WHERE to_regclass('public.' || e.tbl) IS NULL
GROUP BY e.tbl

UNION ALL
SELECT 'missing column', e.tbl || '.' || e.col, e.used_by
FROM expected_columns e
WHERE to_regclass('public.' || e.tbl) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = e.tbl AND c.column_name = e.col)

UNION ALL
SELECT 'missing function', f.fn, f.used_by
FROM expected_functions f
WHERE NOT EXISTS (
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = f.fn)

UNION ALL
SELECT 'missing index', i.idx, i.used_by
FROM expected_indexes i
WHERE NOT EXISTS (SELECT 1 FROM pg_indexes x WHERE x.schemaname = 'public' AND x.indexname = i.idx)

UNION ALL
SELECT 'RLS disabled', r.tbl, 'table holds guest/venue data and must have row level security'
FROM rls_tables r JOIN pg_tables t ON t.schemaname = 'public' AND t.tablename = r.tbl
WHERE NOT t.rowsecurity

UNION ALL
SELECT 'policy allows anonymous writes', p.tablename || ' / ' || p.policyname,
       'writes must go through the API; drop this policy'
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND p.tablename IN ('lobby_messages','table_invitations','private_chats','private_chat_messages',
                      'guest_sessions','guest_wallet_claims','guest_wallets','wallet_redemptions',
                      'venue_wallets','venue_subscriptions')
  AND p.cmd IN ('INSERT','UPDATE','DELETE','ALL')
  AND (p.roles && ARRAY['public','anon']::name[])

UNION ALL
SELECT 'anon can run generate_daily_z_report', 'generate_daily_z_report',
       'any visitor could read any venue''s revenue (migration 20261008000001 revokes this)'
WHERE to_regprocedure('public.generate_daily_z_report(uuid,date)') IS NOT NULL
  AND has_function_privilege('anon', to_regprocedure('public.generate_daily_z_report(uuid,date)'), 'EXECUTE')

UNION ALL
SELECT 'staff_notifications rejects BILL', 'staff_notifications.notification_type',
       '"request bill" inserts fail (migration 20261008000004)'
WHERE to_regclass('public.staff_notifications') IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = 'public.staff_notifications'::regclass AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%notification_type%'
      AND pg_get_constraintdef(c.oid) NOT ILIKE '%BILL%')

UNION ALL
SELECT 'orders rejects SPLIT payments', 'orders.payment_method',
       'split-tender room checkout fails (migration 20261008000004)'
WHERE EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = 'public.orders'::regclass AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%payment_method%'
      AND pg_get_constraintdef(c.oid) NOT ILIKE '%SPLIT%')

UNION ALL
SELECT 'lobby feed not in realtime publication', 'lobby_messages',
       'live lounge feed will not update'
WHERE to_regclass('public.lobby_messages') IS NOT NULL
  AND EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
  AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'lobby_messages')

ORDER BY 1, 2;

-- ----------------------------------------------------------------------------
-- Second query (optional): argument lists of the functions the code calls, to compare against
-- the parameter names the code passes (e.g. submit_guest_order_atomic(p_business_id, ...)).
-- ----------------------------------------------------------------------------
-- SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
-- FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND p.proname IN (
--   'submit_guest_order_atomic','execute_atomic_bill_settlement','update_kot_status',
--   'approve_topup_request','deduct_venue_wallet_credits','deduct_inventory_stock',
--   'deduct_recipe_inventory_for_order','provision_host_business','generate_daily_z_report')
-- ORDER BY 1;
