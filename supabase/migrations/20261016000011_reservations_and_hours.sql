-- Opening hours (per weekday, IST) and table reservations.

CREATE TABLE IF NOT EXISTS venue_operating_hours (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  weekday     smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  open_time   time NOT NULL DEFAULT '10:00:00',
  close_time  time NOT NULL DEFAULT '22:00:00',
  is_closed   boolean NOT NULL DEFAULT false,
  CONSTRAINT venue_operating_hours_business_weekday_key UNIQUE (business_id, weekday),
  CONSTRAINT venue_operating_hours_window CHECK (is_closed OR close_time > open_time)
);

CREATE TABLE IF NOT EXISTS venue_reservations (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id   uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  table_id      uuid REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  table_number  text NOT NULL,
  guest_name    text NOT NULL CHECK (length(trim(guest_name)) > 0),
  guest_phone   text NOT NULL,
  party_size    smallint NOT NULL CHECK (party_size BETWEEN 1 AND 20),
  reserved_date date NOT NULL,
  reserved_time time NOT NULL,
  status        text NOT NULL DEFAULT 'requested'
                  CHECK (status IN ('requested','confirmed','seated','cancelled','no_show')),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_reservations_business_date
  ON venue_reservations (business_id, reserved_date, reserved_time);

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS reservations_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE venue_operating_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manages hours" ON venue_operating_hours FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid()));

CREATE POLICY "public reads hours" ON venue_operating_hours FOR SELECT USING (true);

CREATE POLICY "owner manages reservations" ON venue_reservations FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid()));

CREATE OR REPLACE FUNCTION venue_status_now(p_business_id uuid)
RETURNS TABLE (
  is_open boolean,
  opens_at text,
  closes_at text,
  reservations_enabled boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_local timestamp := now() AT TIME ZONE 'Asia/Kolkata';
  v_hours record;
  v_enabled boolean;
BEGIN
  SELECT COALESCE(b.reservations_enabled, false) INTO v_enabled FROM businesses b WHERE b.id = p_business_id;

  SELECT h.open_time, h.close_time, h.is_closed INTO v_hours
  FROM venue_operating_hours h
  WHERE h.business_id = p_business_id AND h.weekday = EXTRACT(dow FROM v_local)::smallint;

  IF NOT FOUND OR v_hours.is_closed THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, COALESCE(v_enabled, false);
    RETURN;
  END IF;

  RETURN QUERY SELECT
    (v_local::time >= v_hours.open_time AND v_local::time < v_hours.close_time),
    to_char(v_hours.open_time, 'HH24:MI'),
    to_char(v_hours.close_time, 'HH24:MI'),
    COALESCE(v_enabled, false);
END;
$$;

GRANT EXECUTE ON FUNCTION venue_status_now(uuid) TO anon, authenticated;

-- Books one table for one slot. Serialised per venue and date, so two guests can never take the same table.
-- p_table_id null: the smallest free table that seats the party. Raises SLOT_FULL when none is free.
CREATE OR REPLACE FUNCTION create_reservation_atomic(
  p_business_id uuid,
  p_guest_name  text,
  p_guest_phone text,
  p_party_size  smallint,
  p_date        date,
  p_time        time,
  p_table_id    uuid,
  p_notes       text
)
RETURNS venue_reservations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_table restaurant_tables;
  v_row venue_reservations;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id::text || ':' || p_date::text, 0));

  IF NOT EXISTS (SELECT 1 FROM businesses WHERE id = p_business_id AND reservations_enabled) THEN
    RAISE EXCEPTION 'RESERVATIONS_OFF';
  END IF;

  IF p_table_id IS NOT NULL THEN
    SELECT * INTO v_table FROM restaurant_tables
    WHERE id = p_table_id AND business_id = p_business_id AND is_active;
    IF NOT FOUND THEN RAISE EXCEPTION 'TABLE_NOT_FOUND'; END IF;
    IF v_table.seating_capacity < p_party_size THEN RAISE EXCEPTION 'TABLE_TOO_SMALL'; END IF;
    IF EXISTS (
      SELECT 1 FROM venue_reservations r
      WHERE r.business_id = p_business_id AND r.reserved_date = p_date AND r.reserved_time = p_time
        AND r.table_id = p_table_id AND r.status IN ('requested','confirmed','seated')
    ) THEN RAISE EXCEPTION 'TABLE_TAKEN'; END IF;
  ELSE
    SELECT t.* INTO v_table FROM restaurant_tables t
    WHERE t.business_id = p_business_id AND t.is_active AND t.seating_capacity >= p_party_size
      AND NOT EXISTS (
        SELECT 1 FROM venue_reservations r
        WHERE r.business_id = p_business_id AND r.reserved_date = p_date AND r.reserved_time = p_time
          AND r.table_id = t.id AND r.status IN ('requested','confirmed','seated')
      )
    ORDER BY t.seating_capacity, t.table_number
    LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'SLOT_FULL'; END IF;
  END IF;

  INSERT INTO venue_reservations (business_id, table_id, table_number, guest_name, guest_phone, party_size, reserved_date, reserved_time, notes)
  VALUES (p_business_id, v_table.id, v_table.table_number, p_guest_name, p_guest_phone, p_party_size, p_date, p_time, p_notes)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION create_reservation_atomic(uuid, text, text, smallint, date, time, uuid, text) TO service_role;
