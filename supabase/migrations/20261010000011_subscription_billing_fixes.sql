-- 20261010000011_subscription_billing_fixes.sql
-- Plan purchases and wallet top-ups, approved by the platform.
--
-- Fixes in approve_topup_request (20261006000003):
--   * A plan purchase no longer ALSO credits the wallet with the plan price (the venue was paid twice:
--     a plan plus ₹8k–14k of fee credit).
--   * A plan now runs 12 months + its bonus months (2 / 6 / 9). It ran for the bonus months only.
--     Renewing early extends from the current end date, so no paid days are lost.
--   * A plan request is approved only for at least the plan's price.
--   * A plan purchase is logged as PLAN_PURCHASE (cost 0: it does not touch the wallet) and a top-up as
--     WALLET_TOPUP, so the venue's statement can tell them apart.
-- Safe to re-run.

begin;

-- Leftover open policies from 20260930000003 (also removed by the RLS lockdown; dropped again by name).
drop policy if exists "Public insert venue_subscriptions" on public.venue_subscriptions;
drop policy if exists "Public update venue_subscriptions" on public.venue_subscriptions;
drop policy if exists "Public insert venue_wallets" on public.venue_wallets;
drop policy if exists "Public update venue_wallets" on public.venue_wallets;
drop policy if exists "Public insert usage_ledger" on public.usage_ledger;

-- A filed payment is for a real, bounded amount.
alter table public.venue_topup_requests drop constraint if exists chk_topup_amount;
alter table public.venue_topup_requests
  add constraint chk_topup_amount check (amount > 0 and amount <= 1000000) not valid;

create or replace function public.approve_topup_request(p_request_id uuid, p_admin_id text default 'admin')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req record;
  v_now timestamptz := timezone('utc', now());
  v_balance numeric;
  v_is_plan boolean;
  v_price numeric;
  v_bonus int;
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
    or (v_req.requested_plan_tier is not null and v_req.requested_plan_tier <> 'pay_as_you_go');

  if v_is_plan then
    v_price := case v_req.requested_plan_tier when '8k_2m' then 8000 when '12k_6m' then 12000 when '14k_9m' then 14000 end;
    v_bonus := case v_req.requested_plan_tier when '8k_2m' then 2 when '12k_6m' then 6 when '14k_9m' then 9 end;
    if v_price is null then
      return jsonb_build_object('success', false, 'error', 'UNKNOWN_PLAN');
    end if;
    if v_req.amount < v_price then
      return jsonb_build_object('success', false, 'error', 'AMOUNT_BELOW_PLAN_PRICE',
        'plan_price', v_price, 'paid', v_req.amount);
    end if;

    -- Extend from the current end date while a paid plan is still running.
    select greatest(v_now, coalesce(expires_at, v_now)) into v_from
      from public.venue_subscriptions
     where venue_id = v_req.venue_id and plan_tier <> 'pay_as_you_go' and status in ('active', 'trial');
    v_until := coalesce(v_from, v_now) + make_interval(months => 12 + v_bonus);

    insert into public.venue_subscriptions (venue_id, plan_tier, status, trial_ends_at, expires_at, updated_at)
    values (v_req.venue_id, v_req.requested_plan_tier, 'active', null, v_until, v_now)
    on conflict (venue_id) do update
      set plan_tier = excluded.plan_tier, status = 'active', trial_ends_at = null,
          expires_at = excluded.expires_at, updated_at = v_now;

    select balance into v_balance from public.venue_wallets where venue_id = v_req.venue_id;
  else
    insert into public.venue_wallets (venue_id, balance, currency, updated_at)
    values (v_req.venue_id, v_req.amount, 'INR', v_now)
    on conflict (venue_id) do update
      set balance = public.venue_wallets.balance + excluded.balance, updated_at = v_now
    returning balance into v_balance;

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
    case when v_is_plan then 0 else v_req.amount end,
    coalesce(v_balance, 0),
    'TOPUP_' || p_request_id::text,
    jsonb_build_object('utr', v_req.utr_number, 'payment_method', v_req.payment_method, 'admin_id', p_admin_id,
      'amount', v_req.amount, 'plan_tier', case when v_is_plan then v_req.requested_plan_tier end,
      'plan_expires_at', v_until),
    v_now
  );

  return jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'venue_id', v_req.venue_id,
    'credited_amount', case when v_is_plan then 0 else v_req.amount end,
    'new_balance', coalesce(v_balance, 0),
    'plan_updated', v_is_plan,
    'plan_expires_at', v_until
  );
end;
$$;

revoke all on function public.approve_topup_request(uuid, text) from public, anon, authenticated;
grant execute on function public.approve_topup_request(uuid, text) to service_role;

commit;
