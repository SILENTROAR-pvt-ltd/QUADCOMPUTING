-- 20261005000002_rls_lockdown.sql   (STAGE 2)
-- RUN ON STAGING FIRST, and ONLY after guest + money routes use adminDb() (service role).
-- After this: anon has ZERO table/function access. Guests reach data only via your Next.js routes.
-- Host (authenticated) keeps tenant-scoped access; money/ledger tables become host READ-ONLY.
-- Run rls_tests.sql right after. Everything below is idempotent.
begin;

-- 0. Kill table mirror (recursion risk + duplicate truth) and NULL-location duplicate tables
drop trigger if exists trg_sync_tables_to_restaurant_tables on public.tables;
drop trigger if exists trg_sync_restaurant_tables_to_tables on public.restaurant_tables;
create unique index if not exists uq_rt_business_table on public.restaurant_tables (business_id, table_number);

-- 1. Drop EVERY open policy: USING(true) / WITH CHECK(true) / anything targeting anon.
--    (Policies are permissive = OR'd, so "strict" policies never overrode these.)
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname from pg_policies
     where schemaname = 'public'
       and ( lower(coalesce(qual, ''))       in ('true', '(true)')
          or lower(coalesce(with_check, '')) in ('true', '(true)')
          or 'anon' = any (roles::text[]) )
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    raise notice 'dropped: %.% -> %', p.schemaname, p.tablename, p.policyname;
  end loop;
end $$;

-- 2. Ledger tables keyed by business_id: host READ-ONLY (writes only via service-role RPCs)
do $$
declare t text;
begin
  foreach t in array array['guest_wallets', 'wallet_transactions'] loop
    execute format('drop policy if exists %I on public.%I', 'Host and staff access ' || t, t);
    execute format('drop policy if exists host_read_%1$s on public.%1$s', t);
    execute format(
      'create policy host_read_%1$s on public.%1$s for select to authenticated
         using (business_id = any ((select public.get_auth_business_ids())))', t);
  end loop;
end $$;

drop policy if exists host_read_wallet_redemptions on public.wallet_redemptions;
create policy host_read_wallet_redemptions on public.wallet_redemptions
  for select to authenticated
  using (business_id in (select unnest(public.get_auth_business_ids())::text));

-- 3. Platform-billing tables keyed by venue_id: host READ-ONLY
do $$
declare t text;
begin
  foreach t in array array['venue_wallets', 'venue_subscriptions', 'usage_ledger',
                           'venue_outstanding_bills', 'venue_topup_requests'] loop
    execute format('drop policy if exists host_read_%1$s on public.%1$s', t);
    execute format(
      'create policy host_read_%1$s on public.%1$s for select to authenticated
         using (venue_id = any ((select public.get_auth_business_ids())))', t);
  end loop;
end $$;

-- host may only FILE a pending top-up request for own venue; approval = admin_approve_topup() via service role
drop policy if exists host_insert_pending_topup on public.venue_topup_requests;
create policy host_insert_pending_topup on public.venue_topup_requests
  for insert to authenticated
  with check (venue_id = any ((select public.get_auth_business_ids())) and status = 'pending');

-- 4. Table privileges: anon gets nothing
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from public, anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from public, anon;

-- functions authenticated legitimately needs (RLS helper + SECURITY INVOKER stock deduction)
grant execute on function public.get_auth_business_ids() to authenticated, service_role;
do $$ begin
  grant execute on function public.deduct_inventory_stock(uuid, numeric, uuid, text) to authenticated, service_role;
exception when others then null; end $$;

-- broken / dangerous legacy RPCs: service role only (or drop them)
do $$ begin
  revoke execute on function public.deduct_recipe_inventory_for_order(uuid) from authenticated;
exception when others then null; end $$;
do $$ begin
  revoke execute on function public.execute_atomic_bill_settlement(text, text, text, uuid, numeric, numeric, numeric, text, text, text, text) from authenticated;
exception when others then null; end $$;
do $$ begin
  revoke execute on function public.deduct_venue_wallet_credits(uuid, numeric, text, text) from authenticated;
exception when others then null; end $$;

-- 5. Stop shipping a guessable default master PIN (new venues start with NO pin until host sets one)
alter table public.businesses alter column admin_pin drop default;

commit;

-- AFTER THIS, these must use adminDb(), not the host/anon client (they write money tables):
--   fee-guard.service (evaluateFeeGuard + deduct RPC), free-tier.service (logFreeTierUsage),
--   wallet-provision.service, wallet-topup.service, venue-plan.service, topup-request-*.service,
--   /api/admin/*, /api/guest/* (all), /api/venue/* (offers, photo-vault), /api/host/wallet/*,
--   kitchen ticket insert in guest-order, dine_in_sessions/orders writes in guest-order & guest-session.
-- Still TODO (not in this file): per-venue sign-ins for staff, hash admin_pin/staff_pin, move bank+pins to a host-only table.
