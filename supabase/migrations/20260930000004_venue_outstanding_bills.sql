-- Migration: venue_outstanding_bills
-- Tracks micro-fee charges (pay-as-you-go) that accumulate weekly

create table if not exists public.venue_outstanding_bills (
  id            uuid primary key default gen_random_uuid(),
  venue_id      uuid not null references public.businesses(id) on delete cascade,
  reference_id  text,
  description   text not null,
  item_type     text not null check (item_type in ('bill_generate', 'menu_addon', 'room_accommodation', 'other')),
  amount        numeric(10, 2) not null default 0.00,
  status        text not null default 'unpaid' check (status in ('unpaid', 'paid')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_venue_outstanding_bills_venue_id
  on public.venue_outstanding_bills(venue_id);

create index if not exists idx_venue_outstanding_bills_status
  on public.venue_outstanding_bills(venue_id, status);

-- Auto-update updated_at
create or replace function public.update_outstanding_bills_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_outstanding_bills_updated_at on public.venue_outstanding_bills;
create trigger trg_outstanding_bills_updated_at
  before update on public.venue_outstanding_bills
  for each row execute function public.update_outstanding_bills_updated_at();

-- RLS — matches project-standard open pattern used for venue_wallets, usage_ledger, etc.
alter table public.venue_outstanding_bills enable row level security;

drop policy if exists "Public select venue_outstanding_bills" on public.venue_outstanding_bills;
create policy "Public select venue_outstanding_bills"
  on public.venue_outstanding_bills for select using (true);

drop policy if exists "Public insert venue_outstanding_bills" on public.venue_outstanding_bills;
create policy "Public insert venue_outstanding_bills"
  on public.venue_outstanding_bills for insert with check (true);

drop policy if exists "Public update venue_outstanding_bills" on public.venue_outstanding_bills;
create policy "Public update venue_outstanding_bills"
  on public.venue_outstanding_bills for update using (true);

