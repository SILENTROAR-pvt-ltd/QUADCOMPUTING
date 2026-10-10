-- 20261010000012_catalog_overview_view.sql
-- Everything the Menu Catalog shows, in one place you can open in Supabase.
--
-- Dishes, rooms and services are rows in catalog_items. Room add-ons (Extra Mattress, Breakfast,
-- Lunch, ...) are not: they are saved with their room category, in room_categories.addons, because
-- stay billing reads them from there. The catalog screen merges the two, so add-ons appeared in the
-- app but never in the catalog_items table.
--
-- catalog_overview lists both, with a `source` column saying where each entry is stored. It is a
-- read-only view: nothing is copied, so the two can never drift apart, and no screen changes.
-- security_invoker: a host sees only their own venue, exactly as the underlying tables allow.
-- Safe to re-run.

begin;

create or replace view public.catalog_overview
with (security_invoker = on) as
select
  ci.id::text           as id,
  ci.business_id,
  'catalog_items'::text  as source,
  ci.item_type,
  ci.name,
  ci.category,
  ci.price,
  coalesce(ci.is_available, true) as is_available,
  null::uuid             as room_category_id,
  null::text             as room_category,
  null::text             as billing_type,
  ci.created_at
from public.catalog_items ci

union all

select
  coalesce(nullif(a->>'id', ''), 'addon_' || rc.id::text || '_' || lower(regexp_replace(trim(a->>'name'), '\s+', '_', 'g'))) as id,
  rc.business_id,
  'room_categories.addons'::text as source,
  'service'::text as item_type,
  trim(a->>'name') as name,
  'Room Add-ons'::text as category,
  case when (a->>'price') ~ '^\s*\d+(\.\d+)?\s*$' then (a->>'price')::numeric else 0 end as price,
  coalesce(a->>'isActive', 'true') not in ('false', 'f', '0') as is_available,
  rc.id   as room_category_id,
  rc.name as room_category,
  coalesce(nullif(a->>'billingType', ''), 'per_stay') as billing_type,
  rc.created_at
from public.room_categories rc
cross join lateral jsonb_array_elements(
  case
    when jsonb_typeof(rc.addons) = 'array' and jsonb_array_length(rc.addons) > 0 then rc.addons
    when jsonb_typeof(rc.available_addons) = 'array' then rc.available_addons
    else '[]'::jsonb
  end
) as a
where coalesce(trim(a->>'name'), '') <> '';

comment on view public.catalog_overview is
  'Every Menu Catalog entry for a venue. source = catalog_items (dishes, rooms, services) or room_categories.addons (room add-ons, edited with their room category).';

revoke all on public.catalog_overview from public, anon;
grant select on public.catalog_overview to authenticated, service_role;

commit;
