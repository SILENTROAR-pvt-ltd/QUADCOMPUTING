-- 20261024000001_qc2_subscription_plans.sql
-- The QC² plans (Vibers Connect pricing, Oct 2026): M¹-Pro ₹8,999/yr (1-month trial, ₹599 one-time setup),
-- M²-Pro ₹14,999/yr (1-month trial), Rhodium Pro ₹48,999/yr, and Pay as you go at ₹3 a bill. Prices include GST.
--
--   * plan_tier (subscriptions and payment requests) accepts the new ids. "rhodium_ppb" and the older "pay_as_you_go"
--     both mean Pay as you go, and the three earlier yearly tiers stay so past rows still read.
--   * subscription_plans holds the prices the approval function charges; lib/services/wallet/plans.ts is the same
--     catalogue for the app (plans.test.ts keeps them equal).
--   * trial_used_at: a venue gets one free trial. setup_fee_paid_at: the ₹599 setup is charged once per venue, on any
--     plan (Pay as you go included); venues that joined before 25 Oct 2026 are exempt.
--   * approve_topup_request prices a plan from subscription_plans, adds the setup fee when it is still owed, and runs
--     a plan for its term from approval (or from the current end date, so renewing early loses no days). On a wallet
--     top-up it takes a setup still owed out of the amount and credits the rest.
--   * Vibey AI add-on (₹7,000/yr) for M¹-Pro and M²-Pro venues: catalogue row of kind 'addon'; approving it extends
--     venue_subscriptions.vibey_until by a year and leaves the plan as it is.
-- Safe to re-run.

begin;

-- 1. Plan ids: drop whatever CHECK guards each plan column (names differ by environment), then add the new one.
do $$
declare c record;
begin
  for c in
    select con.conrelid::regclass::text as tbl, con.conname
      from pg_constraint con
      join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
     where con.contype = 'c'
       and ((con.conrelid = 'public.venue_subscriptions'::regclass and att.attname = 'plan_tier')
         or (con.conrelid = 'public.venue_topup_requests'::regclass and att.attname = 'requested_plan_tier'))
  loop
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
  end loop;
end $$;

alter table public.venue_subscriptions add constraint venue_subscriptions_plan_tier_check
  check (plan_tier in ('m1_pro', 'm2_pro', 'rhodium_annual', 'rhodium_ppb', 'pay_as_you_go', '8k_2m', '12k_6m', '14k_9m'));
alter table public.venue_topup_requests add constraint venue_topup_requests_requested_plan_tier_check
  check (requested_plan_tier is null or requested_plan_tier in
    ('m1_pro', 'm2_pro', 'rhodium_annual', 'rhodium_ppb', 'pay_as_you_go', '8k_2m', '12k_6m', '14k_9m', 'vibey_addon'));

-- 2. One trial per venue, setup fee once, the Vibey add-on's end date.
alter table public.venue_subscriptions add column if not exists trial_used_at timestamptz;
alter table public.venue_subscriptions add column if not exists setup_fee_paid_at timestamptz;
alter table public.venue_subscriptions add column if not exists vibey_until timestamptz;

-- Venues that joined before the ₹599 setup fee owe nothing: their setup counts as done.
update public.venue_subscriptions
   set setup_fee_paid_at = coalesce(created_at, timezone('utc', now()))
 where setup_fee_paid_at is null and coalesce(created_at, timezone('utc', now())) < timestamptz '2026-10-25 00:00:00+05:30';

-- 3. The price list the approval function charges.
create table if not exists public.subscription_plans (
  id text primary key,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  term_months int not null check (term_months >= 0),
  trial_days int not null default 0 check (trial_days >= 0),
  setup_fee numeric(10, 2) not null default 0 check (setup_fee >= 0),
  per_bill_fee numeric(10, 2) not null default 0 check (per_bill_fee >= 0),
  purchasable boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now())
);
-- 'plan' replaces the venue's plan; 'addon' (Vibey) is bought on top of M¹-Pro or M²-Pro.
alter table public.subscription_plans add column if not exists kind text not null default 'plan';

insert into public.subscription_plans (id, name, price, term_months, trial_days, setup_fee, per_bill_fee, purchasable, kind) values
  ('m1_pro', 'QC² M¹-Pro', 8999, 12, 30, 599, 0, true, 'plan'),
  ('m2_pro', 'QC² M²-Pro', 14999, 12, 30, 599, 0, true, 'plan'),
  ('rhodium_annual', 'Rhodium Pro', 48999, 12, 0, 599, 0, true, 'plan'),
  ('rhodium_ppb', 'Pay as you go', 0, 0, 0, 599, 3, false, 'plan'),
  ('vibey_addon', 'Vibey AI add-on', 7000, 12, 0, 0, 0, true, 'addon')
on conflict (id) do update set
  name = excluded.name, price = excluded.price, term_months = excluded.term_months, trial_days = excluded.trial_days,
  setup_fee = excluded.setup_fee, per_bill_fee = excluded.per_bill_fee, purchasable = excluded.purchasable,
  kind = excluded.kind, updated_at = timezone('utc', now());

-- Read by the server (service role) only; venues see prices in the app.
alter table public.subscription_plans enable row level security;
revoke all on public.subscription_plans from anon, authenticated;
grant select on public.subscription_plans to service_role;

-- 4. Approving a payment.
create or replace function public.approve_topup_request(p_request_id uuid, p_admin_id text default 'admin')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req record;
  v_plan record;
  v_now timestamptz := timezone('utc', now());
  v_balance numeric;
  v_is_plan boolean;
  v_setup numeric := 0;
  v_setup_paid timestamptz;
  v_kind text;
  v_credit numeric := 0;
  v_from timestamptz;
  v_until timestamptz;
begin
  if p_request_id is null then
    return jsonb_build_object('success', false, 'error', 'REQUEST_ID_REQUIRED');
  end if;

  select * into v_req from public.venue_topup_requests where id = p_request_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'TOPUP_REQUEST_NOT_FOUND');
  end if;

  if v_req.status = 'approved' then
    select balance into v_balance from public.venue_wallets where venue_id = v_req.venue_id;
    return jsonb_build_object('success', true, 'idempotent', true,
      'message', 'Top-up request already approved', 'new_balance', coalesce(v_balance, 0));
  end if;
  if v_req.status <> 'pending' then
    return jsonb_build_object('success', false, 'error', 'INVALID_STATUS', 'current_status', v_req.status);
  end if;
  if v_req.amount is null or v_req.amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'INVALID_AMOUNT');
  end if;

  v_is_plan := v_req.request_type = 'plan_subscription'
    or (v_req.requested_plan_tier is not null and v_req.requested_plan_tier not in ('pay_as_you_go', 'rhodium_ppb'));

  if v_is_plan then
    select * into v_plan from public.subscription_plans where id = v_req.requested_plan_tier and purchasable;
    if not found then
      return jsonb_build_object('success', false, 'error', 'UNKNOWN_PLAN');
    end if;
    if v_req.amount < v_plan.price then
      return jsonb_build_object('success', false, 'error', 'AMOUNT_BELOW_PLAN_PRICE', 'plan_price', v_plan.price, 'paid', v_req.amount);
    end if;
    v_kind := v_plan.kind;
  end if;

  if v_kind = 'addon' then
    -- The Vibey add-on: a year from now, or from its current end date while it still runs. The plan is untouched.
    select greatest(v_now, coalesce(vibey_until, v_now)) into v_from from public.venue_subscriptions where venue_id = v_req.venue_id;
    v_until := coalesce(v_from, v_now) + make_interval(months => v_plan.term_months);
    insert into public.venue_subscriptions (venue_id, vibey_until, updated_at)
    values (v_req.venue_id, v_until, v_now)
    on conflict (venue_id) do update set vibey_until = excluded.vibey_until, updated_at = v_now;
    select balance into v_balance from public.venue_wallets where venue_id = v_req.venue_id;
  elsif v_is_plan then
    select setup_fee_paid_at into v_setup_paid from public.venue_subscriptions where venue_id = v_req.venue_id;
    if v_plan.setup_fee > 0 and v_setup_paid is null then
      v_setup := v_plan.setup_fee;
    end if;
    if v_req.amount < v_plan.price + v_setup then
      return jsonb_build_object('success', false, 'error', 'AMOUNT_BELOW_PLAN_PRICE',
        'plan_price', v_plan.price, 'setup_fee', v_setup, 'paid', v_req.amount);
    end if;

    -- Extend from the current end date while a paid (not trial) yearly plan is still running.
    select greatest(v_now, coalesce(expires_at, v_now)) into v_from
      from public.venue_subscriptions
     where venue_id = v_req.venue_id and status = 'active'
       and plan_tier not in ('pay_as_you_go', 'rhodium_ppb') and expires_at > v_now;
    v_until := coalesce(v_from, v_now) + make_interval(months => v_plan.term_months);

    insert into public.venue_subscriptions (venue_id, plan_tier, status, trial_ends_at, expires_at, setup_fee_paid_at, updated_at)
    values (v_req.venue_id, v_req.requested_plan_tier, 'active', null, v_until, case when v_setup > 0 then v_now end, v_now)
    on conflict (venue_id) do update
      set plan_tier = excluded.plan_tier, status = 'active', trial_ends_at = null, expires_at = excluded.expires_at,
          setup_fee_paid_at = coalesce(public.venue_subscriptions.setup_fee_paid_at, excluded.setup_fee_paid_at),
          updated_at = v_now;

    select balance into v_balance from public.venue_wallets where venue_id = v_req.venue_id;
  else
    -- A wallet top-up. A setup still owed (Pay as you go) comes out of it first; the rest is credit.
    select setup_fee_paid_at into v_setup_paid from public.venue_subscriptions where venue_id = v_req.venue_id;
    if found and v_setup_paid is null then
      select coalesce(setup_fee, 0) into v_setup from public.subscription_plans where id = 'rhodium_ppb';
      v_setup := coalesce(v_setup, 0);
    end if;
    if v_setup > 0 and v_req.amount <= v_setup then
      return jsonb_build_object('success', false, 'error', 'AMOUNT_BELOW_SETUP_FEE', 'setup_fee', v_setup, 'paid', v_req.amount);
    end if;
    v_credit := v_req.amount - v_setup;

    insert into public.venue_wallets (venue_id, balance, currency, updated_at)
    values (v_req.venue_id, v_credit, 'INR', v_now)
    on conflict (venue_id) do update
      set balance = public.venue_wallets.balance + excluded.balance, updated_at = v_now
    returning balance into v_balance;

    if v_setup > 0 then
      update public.venue_subscriptions set setup_fee_paid_at = v_now, updated_at = v_now
       where venue_id = v_req.venue_id and setup_fee_paid_at is null;
    end if;
    update public.venue_subscriptions set status = 'active', updated_at = v_now
     where venue_id = v_req.venue_id and status = 'suspended';
  end if;

  update public.venue_topup_requests
     set status = 'approved', reviewed_by = coalesce(p_admin_id, 'admin'), reviewed_at = v_now, updated_at = v_now
   where id = p_request_id;

  insert into public.usage_ledger (venue_id, action_type, cost, balance_after, reference_id, metadata, created_at)
  values (
    v_req.venue_id,
    case when v_is_plan then 'PLAN_PURCHASE' else 'WALLET_TOPUP' end,
    case when v_is_plan then 0 else v_credit end,
    coalesce(v_balance, 0),
    'TOPUP_' || p_request_id::text,
    jsonb_build_object('utr', v_req.utr_number, 'payment_method', v_req.payment_method, 'admin_id', p_admin_id,
      'amount', v_req.amount, 'plan_tier', case when v_is_plan then v_req.requested_plan_tier end,
      'setup_fee', v_setup, 'addon', v_kind = 'addon', 'plan_expires_at', v_until),
    v_now
  );

  return jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'venue_id', v_req.venue_id,
    'credited_amount', case when v_is_plan then 0 else v_credit end,
    'new_balance', coalesce(v_balance, 0),
    'plan_updated', v_is_plan,
    'setup_fee', v_setup,
    'plan_expires_at', v_until
  );
end;
$$;

revoke all on function public.approve_topup_request(uuid, text) from public, anon, authenticated;
grant execute on function public.approve_topup_request(uuid, text) to service_role;

commit;
