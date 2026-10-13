-- ============================================================================
-- 20261014000001_kitchen_ticket_table_note.sql   (safe to re-run)
--
-- The guest's "Table note for kitchen" is saved once on the kitchen ticket(s) of
-- that order, not copied onto every dish. kitchen_tickets.notes holds it.
-- Apply in the Supabase SQL editor. Nothing is dropped.
-- ============================================================================

ALTER TABLE public.kitchen_tickets ADD COLUMN IF NOT EXISTS notes TEXT;

-- Let the API see the new column straight away (PostgREST caches the schema).
NOTIFY pgrst, 'reload schema';

-- ----------------------------------------------------------------------------
-- AUDIT (read-only): run these after applying, to confirm.
--
--   select column_name, data_type
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'kitchen_tickets' and column_name = 'notes';
--   -- expect one row: notes | text
--
--   select ticket_number, table_or_room, notes, created_at
--   from public.kitchen_tickets
--   order by created_at desc
--   limit 10;
--   -- after a guest sends an order with a table note, that note is on its ticket(s) only
-- ----------------------------------------------------------------------------
