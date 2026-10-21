'use client';

import { useEffect, useState } from 'react';

export interface DayHours { weekday: number; openTime: string; closeTime: string; isClosed: boolean }

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULT_DAY = (weekday: number): DayHours => ({ weekday, openTime: '10:00', closeTime: '22:00', isClosed: false });
const sameDays = (a: DayHours[], b: DayHours[]) => JSON.stringify(a) === JSON.stringify(b);

/** Open round the clock: every day open from midnight to the last minute of the day. */
export const ALL_DAY = { openTime: '00:00', closeTime: '23:59' } as const;
export const isAllDay = (d: DayHours) => !d.isClosed && d.openTime === ALL_DAY.openTime && d.closeTime === ALL_DAY.closeTime;
export const isOpen247 = (days: DayHours[] | null) => Boolean(days && days.length === 7 && days.every(isAllDay));

/** The venue's weekly opening hours and the reservations switch. Saved on its own, apart from the profile form. */
export function useOperatingHours() {
  const [days, setDays] = useState<DayHours[] | null>(null);
  const [saved, setSaved] = useState<DayHours[] | null>(null);
  const [reservationsOn, setReservationsOn] = useState(false);
  const [savedReservations, setSavedReservations] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/host/operating-hours', { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Opening hours could not be loaded.');
        const byDay = new Map<number, DayHours>((json.hours ?? []).map((h: DayHours) => [h.weekday, h]));
        const next = [0, 1, 2, 3, 4, 5, 6].map((d) => byDay.get(d) ?? DEFAULT_DAY(d));
        setDays(next); setSaved(next);
        setReservationsOn(Boolean(json.reservationsEnabled)); setSavedReservations(Boolean(json.reservationsEnabled));
      } catch (e: any) {
        setLoadError(e.message);
      }
    })();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const dirty = Boolean(days && saved) && (!sameDays(days!, saved!) || reservationsOn !== savedReservations);

  const updateDay = (weekday: number, patch: Partial<DayHours>) =>
    setDays((list) => list?.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)) ?? list);

  /**
   * "Open 24/7" on: every day opens at midnight and closes at the last minute. Off: back to the saved hours, or the
   * usual 10 to 10 when the saved hours were themselves round the clock, so the day rows have something to edit.
   */
  const open247 = isOpen247(days);
  const setOpen247 = (on: boolean) =>
    setDays((list) => {
      if (!list) return list;
      if (on) return list.map((d) => ({ ...d, isClosed: false, ...ALL_DAY }));
      const back = saved && !isOpen247(saved) ? saved : list.map((d) => DEFAULT_DAY(d.weekday));
      return back.map((d) => ({ ...d }));
    });

  const save = async () => {
    if (!days) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/host/operating-hours', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours: days, reservationsEnabled: reservationsOn }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || 'Nothing was saved. Please try again.'); return; }
      setSaved(days); setSavedReservations(reservationsOn);
      setNotice('Opening hours saved. Guests see them straight away.');
    } catch {
      setError('No connection. Nothing was saved.');
    } finally {
      setSaving(false);
    }
  };

  const discard = () => { setDays(saved); setReservationsOn(savedReservations); setError(null); };

  return { days, reservationsOn, setReservationsOn, updateDay, open247, setOpen247, save, discard, dirty, saving, error, notice, loadError };
}
