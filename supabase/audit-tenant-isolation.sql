-- TENANT ISOLATION TEST (read-only in effect: everything is rolled back, nothing is saved).
--
-- For every venue owner in the database, this signs in as that owner the way the browser does (role authenticated,
-- their user id in the token) and asks every table two questions:
--   read  : how many rows of OTHER venues can this owner see?
--   write : how many rows of OTHER venues would an update by this owner reach? (a no-op update: col = col)
-- A row's venue is its business_id / venue_id / cafe_id, its owner (host_id, or a profile's id), or, for stock and dish
-- options, the venue of the dish it belongs to. Tables with none of these are checked for any row an owner can read.
-- It never prints a row, only table names and counts. At the end it stops with an error on purpose: the error text is
-- the report, and stopping with an error rolls the whole run back, so not even the no-op updates are kept.
--
-- Run it in the Supabase SQL editor and paste back the message that starts with "TENANT ISOLATION".
DO $$
DECLARE
  t record;
  h record;
  n bigint;
  hosts int;
  col text;
  foreign_rows text;
  max_read bigint; max_write bigint; hosts_read int; hosts_write int;
  flagged text := '';
  public_by_design text := '';
  clean int := 0;
  unscoped text := '';
  clean_unscoped int := 0;
  -- Read on purpose by guests (the menu, table list, room types, offers, photos, hours, lobby): seeing them is expected.
  -- Not rooms: a room row carries the staying guest's name and phone.
  public_tables text[] := array['catalog_items','restaurant_tables','room_categories','venue_live_offers',
                                'venue_photo_vault','venue_operating_hours','lobby_messages','venue_events','venue_moments'];
BEGIN
  SELECT count(DISTINCT host_id) INTO hosts FROM public.businesses WHERE host_id IS NOT NULL;

  FOR t IN
    SELECT c.relname AS tbl,
      CASE WHEN c.relname = 'businesses' THEN 'id' ELSE
        (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = c.oid AND NOT a.attisdropped
           AND a.attname IN ('business_id','venue_id','cafe_id')
         ORDER BY array_position(array['business_id','venue_id','cafe_id']::name[], a.attname) LIMIT 1) END AS vcol,
      CASE WHEN c.relname = 'profiles' THEN 'id' ELSE
        (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = c.oid AND NOT a.attisdropped AND a.attname = 'host_id') END AS hcol,
      (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = c.oid AND NOT a.attisdropped AND a.attname = 'catalog_item_id') AS icol
    FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'public' AND c.relkind IN ('r','p')
    ORDER BY 1
  LOOP
    -- Which rows belong to other venues ($1 = the owner's venue ids, $2 = the owner's user id), and the column a no-op
    -- update rewrites to itself.
    IF t.vcol IS NOT NULL THEN
      col := t.vcol; foreign_rows := format('%I::text <> ALL ($1)', t.vcol);
    ELSIF t.hcol IS NOT NULL THEN
      col := t.hcol; foreign_rows := format('%I::text <> $2', t.hcol);
    ELSIF t.icol IS NOT NULL THEN
      col := t.icol; foreign_rows := 'catalog_item_id NOT IN (SELECT id FROM public.catalog_items WHERE business_id::text = ANY ($1))';
    ELSE
      col := NULL; foreign_rows := 'true';
    END IF;
    max_read := 0; max_write := 0; hosts_read := 0; hosts_write := 0;

    FOR h IN SELECT host_id AS uid, array_agg(id::text) AS ids FROM public.businesses WHERE host_id IS NOT NULL GROUP BY host_id LOOP
      -- read
      BEGIN
        PERFORM set_config('request.jwt.claims', json_build_object('sub', h.uid, 'role', 'authenticated')::text, true);
        PERFORM set_config('request.jwt.claim.sub', h.uid::text, true);
        EXECUTE 'SET LOCAL ROLE authenticated';
        EXECUTE format('SELECT count(*) FROM public.%I WHERE %s', t.tbl, foreign_rows) INTO n USING h.ids, h.uid::text;
        EXECUTE 'RESET ROLE';
        IF n > 0 THEN hosts_read := hosts_read + 1; max_read := greatest(max_read, n); END IF;
      EXCEPTION WHEN others THEN NULL; -- refused (no grant / policy error): nothing visible; role falls back with the step
      END;
      -- write (no-op update), only where a row's venue is known
      CONTINUE WHEN col IS NULL;
      BEGIN
        PERFORM set_config('request.jwt.claims', json_build_object('sub', h.uid, 'role', 'authenticated')::text, true);
        PERFORM set_config('request.jwt.claim.sub', h.uid::text, true);
        EXECUTE 'SET LOCAL ROLE authenticated';
        EXECUTE format('WITH u AS (UPDATE public.%I SET %I = %I WHERE %s RETURNING 1) SELECT count(*) FROM u',
                       t.tbl, col, col, foreign_rows) INTO n USING h.ids, h.uid::text;
        EXECUTE 'RESET ROLE';
        IF n > 0 THEN hosts_write := hosts_write + 1; max_write := greatest(max_write, n); END IF;
      EXCEPTION WHEN others THEN NULL;
      END;
    END LOOP;

    IF col IS NULL THEN
      IF max_read > 0 THEN
        EXECUTE format('SELECT count(*) FROM public.%I', t.tbl) INTO n;
        unscoped := unscoped || format(E'\n  %s: an owner can read %s of %s rows', t.tbl, max_read, n);
      ELSE
        clean_unscoped := clean_unscoped + 1;
      END IF;
    ELSIF max_write > 0 OR (max_read > 0 AND NOT t.tbl = ANY (public_tables)) THEN
      flagged := flagged || format(E'\n  %s: read %s other-venue rows (%s/%s owners), write %s (%s/%s owners)',
                                   t.tbl, max_read, hosts_read, hosts, max_write, hosts_write, hosts);
    ELSIF max_read > 0 THEN
      public_by_design := public_by_design || t.tbl || ' ';
    ELSE
      clean := clean + 1;
    END IF;
  END LOOP;

  RAISE EXCEPTION '%', format(
    E'TENANT ISOLATION %s (owners tested: %s; rolled back, nothing saved)\n  sealed venue tables: %s\n  readable on purpose (guest menu data): %s%s\n  tables with no venue link: %s sealed%s',
    CASE WHEN flagged = '' AND unscoped = '' THEN 'PASSED' ELSE 'FINDINGS' END, hosts, clean,
    coalesce(nullif(public_by_design, ''), 'none'),
    CASE WHEN flagged = '' THEN '' ELSE E'\n  CHECK THESE:' || flagged END,
    clean_unscoped,
    CASE WHEN unscoped = '' THEN '' ELSE E'\n  READABLE BY ANY OWNER (no venue link):' || unscoped END);
END $$;
