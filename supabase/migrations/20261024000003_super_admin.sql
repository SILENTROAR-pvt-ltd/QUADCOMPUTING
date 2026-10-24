-- 20261024000003_super_admin.sql
-- The super admin dashboard (/admin): what the platform owner needs that no venue table holds yet.
--
--   1. platform_admin_actions  every super-admin action (plan changes, suspensions, reviews, exports), append-only
--   2. platform_venue_reviews  vetting status per venue (approved / needs documents / rejected); live partners approved
--   3. platform_announcements  notices pushed to every venue's control center
--   4. support_tickets         venues ask for help from My profile; the super admin answers in /admin/support
--   5. admin_orders_daily / admin_orders_heatmap: platform-wide rollups of settled bills (IST days), so the dashboard
--      never pulls raw orders into the app, plus a partial index that serves them
--
-- All of it is server-only (service_role); no venue or guest login can read or write any of it. Safe to re-run.

begin;

-- 1. Admin actions (append-only: insert and read, never update or delete).
create table if not exists public.platform_admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  admin_email text,
  action text not null check (length(action) between 3 and 60),
  venue_id uuid references public.businesses(id) on delete set null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);
create index if not exists platform_admin_actions_created_idx on public.platform_admin_actions (created_at desc);
create index if not exists platform_admin_actions_venue_idx on public.platform_admin_actions (venue_id, created_at desc);
alter table public.platform_admin_actions enable row level security;
revoke all on public.platform_admin_actions from public, anon, authenticated, service_role;
grant select, insert on public.platform_admin_actions to service_role;

-- 2. Venue reviews.
create table if not exists public.platform_venue_reviews (
  venue_id uuid primary key references public.businesses(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'needs_docs', 'rejected')),
  note text check (note is null or length(note) <= 500),
  reviewed_by uuid,
  reviewed_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now())
);
alter table public.platform_venue_reviews enable row level security;
revoke all on public.platform_venue_reviews from public, anon, authenticated;
grant select, insert, update on public.platform_venue_reviews to service_role;
-- Venues already trading before reviews began are live partners: approved.
insert into public.platform_venue_reviews (venue_id, status, note, reviewed_at)
select id, 'approved', 'Partner before venue reviews began', timezone('utc', now())
  from public.businesses where created_at < timestamptz '2026-10-25 00:00:00+05:30'
on conflict (venue_id) do nothing;

-- 3. Announcements.
create table if not exists public.platform_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 3 and 120),
  body text check (body is null or length(body) <= 600),
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  starts_at timestamptz not null default timezone('utc', now()),
  ends_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  withdrawn_at timestamptz
);
create index if not exists platform_announcements_live_idx on public.platform_announcements (starts_at desc) where withdrawn_at is null;
alter table public.platform_announcements enable row level security;
revoke all on public.platform_announcements from public, anon, authenticated;
grant select, insert, update on public.platform_announcements to service_role;

-- 4. Support tickets.
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.businesses(id) on delete cascade,
  created_by uuid,
  subject text not null check (length(subject) between 3 and 140),
  body text not null check (length(body) between 3 and 4000),
  category text not null default 'technical' check (category in ('technical', 'billing', 'account', 'other')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  admin_note text check (admin_note is null or length(admin_note) <= 2000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz
);
create index if not exists support_tickets_status_idx on public.support_tickets (status, created_at desc);
create index if not exists support_tickets_venue_idx on public.support_tickets (venue_id, created_at desc);
alter table public.support_tickets enable row level security;
revoke all on public.support_tickets from public, anon, authenticated;
grant select, insert, update on public.support_tickets to service_role;

-- 5. Rollups of settled bills by India day (the business day every venue report uses).
create index if not exists orders_settled_created_idx on public.orders (created_at) where status in ('settled', 'SETTLED');

create or replace function public.admin_orders_daily(p_from timestamptz)
returns table (day date, venue_id uuid, orders bigint, gmv numeric, subtotal numeric, discount numeric, tax numeric, stay_gmv numeric)
language sql
stable
security definer
set search_path = public
as $$
  select (o.created_at at time zone 'Asia/Kolkata')::date,
         o.business_id,
         count(*),
         coalesce(sum(o.grand_total), 0),
         coalesce(sum(o.subtotal), 0),
         coalesce(sum(o.discount_amount), 0),
         coalesce(sum(o.tax_amount), 0),
         coalesce(sum(o.grand_total) filter (where o.order_type in ('room_stay', 'room_advance')), 0)
    from public.orders o
   where o.created_at >= p_from and o.status in ('settled', 'SETTLED')
   group by 1, 2;
$$;

create or replace function public.admin_orders_heatmap(p_from timestamptz)
returns table (dow int, hour int, orders bigint)
language sql
stable
security definer
set search_path = public
as $$
  select extract(isodow from o.created_at at time zone 'Asia/Kolkata')::int,
         extract(hour from o.created_at at time zone 'Asia/Kolkata')::int,
         count(*)
    from public.orders o
   where o.created_at >= p_from and o.status in ('settled', 'SETTLED')
   group by 1, 2;
$$;

revoke all on function public.admin_orders_daily(timestamptz) from public, anon, authenticated;
revoke all on function public.admin_orders_heatmap(timestamptz) from public, anon, authenticated;
grant execute on function public.admin_orders_daily(timestamptz) to service_role;
grant execute on function public.admin_orders_heatmap(timestamptz) to service_role;

commit;

notify pgrst, 'reload schema';

-- Read-back: 4 tables and 2 functions once applied.
select (select count(*) from information_schema.tables where table_schema = 'public'
          and table_name in ('platform_admin_actions', 'platform_venue_reviews', 'platform_announcements', 'support_tickets')) as admin_tables,
       (select count(*) from pg_proc where proname in ('admin_orders_daily', 'admin_orders_heatmap')) as admin_functions;
