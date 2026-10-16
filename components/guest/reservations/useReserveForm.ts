'use client';

import { useEffect, useMemo, useState } from 'react';

export interface TableChoice { id: string; label: string; seats: number; free: boolean }

/** The calendar date `days` from today in India time, as YYYY-MM-DD. */
export const istDateOffset = (days: number) => new Date(Date.now() + 5.5 * 3600_000 + days * 86_400_000).toISOString().slice(0, 10);

const PHONE_RE = /^\+?[0-9\s-]{7,15}$/;

interface Args { venueId: string; initialName: string; initialPhone: string }

/** The guest's booking: date, slot, party, optional table, and their details. Submitting is the only write. */
export function useReserveForm({ venueId, initialName, initialPhone }: Args) {
  const dates = useMemo(() => [0, 1, 2, 3, 4, 5, 6].map(istDateOffset), []);
  const [date, setDate] = useState(dates[0]);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [tables, setTables] = useState<TableChoice[] | null>(null);
  const [tableId, setTableId] = useState<string | null>(null);
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState<{ time: string; date: string; table: string } | null>(null);
  const [tablesVersion, setTablesVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSlots(null); setTime(null);
    fetch(`/api/guest/slots?cafe_id=${encodeURIComponent(venueId)}&date=${date}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setSlots(j.slots ?? []); })
      .catch(() => { if (!cancelled) setSlots([]); });
    return () => { cancelled = true; };
  }, [venueId, date]);

  useEffect(() => {
    setTableId(null);
    if (!time) { setTables(null); return; }
    let cancelled = false;
    setTables(null);
    fetch(`/api/guest/reserve/tables?cafe_id=${encodeURIComponent(venueId)}&date=${date}&time=${time}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setTables(j.tables ?? []); })
      .catch(() => { if (!cancelled) setTables([]); });
    return () => { cancelled = true; };
  }, [venueId, date, time, tablesVersion]);

  const nowHm = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(11, 16);
  const visibleSlots = slots?.filter((s) => date !== dates[0] || s > nowHm) ?? null;

  const fitsTable = (t: TableChoice) => t.free && t.seats >= partySize;
  const chosenTable = tables?.find((t) => t.id === tableId) ?? null;
  const canTableFit = tableId === null || (chosenTable !== null && fitsTable(chosenTable));
  const enoughTables = tables === null || tables.some(fitsTable);

  const validation = (() => {
    if (!name.trim()) return 'Enter your name.';
    if (!PHONE_RE.test(phone.trim())) return 'Enter a valid phone number.';
    if (!time) return 'Pick a time.';
    return null;
  })();

  const submit = async () => {
    if (validation || !canTableFit) return;
    setSubmitting(true); setError(null);
    try {
      const res = await fetch('/api/guest/reserve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cafe_id: venueId, reserved_date: date, reserved_time: time, party_size: partySize,
          guest_name: name.trim(), guest_phone: phone.trim(), table_id: tableId, notes: notes.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Could not book. Please try again.');
        if (res.status === 409) setTablesVersion((v) => v + 1);
        return;
      }
      setBooked({ time: time!, date, table: json.reservation?.tableNumber ?? '' });
    } catch {
      setError('No connection. Your booking was not sent.');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    dates, date, setDate, slots: visibleSlots, time, setTime, partySize, setPartySize, tables, tableId, setTableId,
    name, setName, phone, setPhone, notes, setNotes, submitting, error, booked, submit,
    validation, canTableFit, enoughTables,
  };
}
