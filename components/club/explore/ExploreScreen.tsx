'use client';

import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Compass, LocateFixed, MapPin, Search, X, Zap } from 'lucide-react';
import { Button, Empty, Notice, Spinner, FOCUS, field } from '../ui';
import { Segmented, Chip } from '../ui-extra';
import { clubFetch } from '../api';
import { CLUB_DISPLAY } from '../fonts';
import { filterExplore, sortExplore, type ExploreItem } from '@/lib/club/explore/explore-filter';
import { ExploreCard } from './ExploreCard';
import { MeetupSheet } from './MeetupForm';
import { PhotoTile } from './PhotoTile';
import { useNearPlace } from './useNearPlace';
import { TYPES } from './explore-meta';

type When = 'any' | 'now' | 'today' | 'week';
const WHEN: Array<[When, string]> = [['any', 'Anytime'], ['now', 'Live now'], ['today', 'Today'], ['week', 'This week']];
/** The one-tap starters: a kind, and the words under it. */
const STARTERS: Array<[string, string, string]> = [
  ['coffee', 'Coffee', 'right now'], ['walk', 'Walk-around', 'anytime'], ['party', 'Party', 'tonight'],
  ['dev', 'Dev meet', 'with peers'], ['together', 'Get-together', 'casual'],
];
const REFRESH_AFTER_MS = 60_000;

function untilFor(when: When): string | null {
  if (when === 'today') { const d = new Date(); d.setHours(23, 59, 59, 999); return d.toISOString(); }
  if (when === 'week') return new Date(Date.now() + 7 * 86_400_000).toISOString();
  return null;
}

/**
 * Explore: trips, events and instant meetups in one feed. The whole feed loads once and every search
 * and filter runs on the phone, so typing and tapping never wait on the server. Things in the member's
 * own city come first. Anyone can start a meetup in a tap; only trips and ticketed events wait for review.
 */
export function ExploreScreen() {
  // Where the member really is: found on a tap from the device's position, never taken from their profile.
  const { near, locate, clear: forgetNear, busy: locating, error: locError } = useNearPlace();
  const [feed, setFeed] = useState<ExploreItem[] | null>(null);
  const [q, setQ] = useState('');
  const [where, setWhere] = useState('');
  const [type, setType] = useState('');
  const [when, setWhen] = useState<When>('any');
  const [mine, setMine] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [places, setPlaces] = useState<string[]>([]);
  const [starter, setStarter] = useState<string | null>(null);
  const loadedAt = useRef(0);

  const load = useCallback(async () => {
    loadedAt.current = Date.now();
    const res = await clubFetch<{ items: ExploreItem[] }>('/explore');
    if (res.ok) { setFeed(res.data.items); setError(''); } else { setError(res.error); setFeed((cur) => cur ?? []); }
  }, []);

  useEffect(() => {
    void load();
    const onVisible = () => { if (document.visibilityState === 'visible' && Date.now() - loadedAt.current > REFRESH_AFTER_MS) void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  useEffect(() => {
    void clubFetch<{ places: Array<{ name: string }> }>('/places?sort=trending').then((r) => { if (r.ok) setPlaces(r.data.places.slice(0, 80).map((p) => p.name)); });
  }, []);

  // Typing stays instant: the list catches up a moment later, without blocking the keystroke.
  const dq = useDeferredValue(q);
  const dw = useDeferredValue(where);
  const shown = useMemo(() => {
    if (!feed) return null;
    let list = filterExplore(feed, { q: dq, location: dw, type, live: when === 'now', until: untilFor(when) });
    if (mine) list = list.filter((i) => i.me.going || i.me.hosting);
    return sortExplore(list, near);
  }, [feed, dq, dw, type, when, mine, near]);

  const toggle = useCallback(async (item: ExploreItem) => {
    setBusyId(item.id);
    setError('');
    const res = await clubFetch(`/meetups/${item.id}`, { body: { action: item.me.going ? 'leave' : 'join' } });
    setBusyId('');
    if (!res.ok) return setError(res.error);
    const m = res.data.meetup;
    setFeed((list) => list?.map((i) => (i.id === item.id ? { ...i, going: m.going, full: m.full, faces: m.faces, me: m.me } : i)) ?? list);
  }, []);

  const suggestions = useMemo(() => Array.from(new Set([...(near ? [near] : []), ...places])), [near, places]);
  const filtered = Boolean(q || where || type || when !== 'any' || mine);
  const clear = () => { setQ(''); setWhere(''); setType(''); setWhen('any'); setMine(false); };

  return (
    <div className="space-y-6">
      <section aria-labelledby="start-title" className="relative overflow-hidden rounded-[32px] bg-[#17301f] p-4 text-[#f6f4ec] shadow-[0_28px_54px_-34px_rgba(23,48,31,0.9)] sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-16 h-52 w-52 rounded-full bg-[#c8da4a]/20 blur-3xl" />
        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#c8da4a]">Instant</p>
          <h2 id="start-title" className={`${CLUB_DISPLAY} mt-1.5 text-[26px] font-semibold leading-tight sm:text-[28px]`}>Feel like company{near ? ` in ${near}` : ''}?</h2>
          <p className="mt-1.5 max-w-md text-sm text-[#f6f4ec]/75">Tap one. It goes live straight away, no review.</p>
          <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-6 sm:gap-3">
            {STARTERS.map(([key, label, sub]) => <PhotoTile key={key} layout="grid" type={key} label={label} sub={sub} onClick={() => setStarter(key)} />)}
            <PhotoTile layout="grid" tone="accent" icon={Zap} label="More" sub="any kind" onClick={() => setStarter('coffee')} />
          </div>
        </div>
      </section>

      <section aria-label="Search and filters" className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="relative block">
            <span className="sr-only">Search</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#14261b]/45" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search things to do${near ? ` near ${near}` : ''}`} className={`${field} pl-11`} />
          </label>
          <div className="relative">
            <label className="relative block">
              <span className="sr-only">Where</span>
              <MapPin aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#14261b]/45" />
              <input value={where} onChange={(e) => setWhere(e.target.value)} list="explore-places" placeholder="Anywhere" className={`${field} pl-11 pr-28`} />
            </label>
            <datalist id="explore-places">{suggestions.map((p) => <option key={p} value={p} />)}</datalist>
            {where
              ? <button type="button" onClick={() => setWhere('')} aria-label="Clear location" className={`absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-[#14261b]/55 hover:bg-white ${FOCUS}`}><X aria-hidden="true" className="h-4 w-4" /></button>
              : near
                ? <span className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
                    <button type="button" onClick={() => setWhere(near)} title={`Show things in ${near}`} className={`inline-flex max-w-[7.5rem] items-center gap-1 rounded-full bg-[#e1efe3] px-3 py-1.5 text-xs font-semibold text-[#2f5d1f] hover:bg-[#d3e6d6] ${FOCUS}`}><LocateFixed aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{near}</span></button>
                    <button type="button" onClick={forgetNear} aria-label="Forget my location" className={`grid h-7 w-7 place-items-center rounded-full text-[#14261b]/45 hover:bg-white ${FOCUS}`}><X aria-hidden="true" className="h-3.5 w-3.5" /></button>
                  </span>
                : <button type="button" onClick={() => void locate()} disabled={locating} className={`absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#2f5d1f] ring-1 ring-[#14261b]/10 hover:bg-[#e1efe3] disabled:opacity-60 ${FOCUS}`}><LocateFixed aria-hidden="true" className="h-3.5 w-3.5" />{locating ? 'Finding…' : 'Near me'}</button>}
          </div>
        </div>
        <Notice tone="info">{locError}</Notice>

        <div role="group" aria-label="Type" className="no-scrollbar -mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-1">
          <PhotoTile layout="row" icon={Compass} label="All" sub={`${feed?.length ?? 0} to do`} active={!type} onClick={() => setType('')} />
          {TYPES.map((t) => <PhotoTile key={t.key} layout="row" type={t.key} label={t.plural} active={type === t.key} onClick={() => setType(type === t.key ? '' : t.key)} />)}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Segmented label="When" value={when} options={WHEN} onChange={setWhen} />
          <Chip active={mine} onClick={() => setMine((v) => !v)}>Mine</Chip>
          {filtered && <button type="button" onClick={clear} className={`rounded-full px-3 py-2 text-xs font-semibold text-[#3c6b2b] underline-offset-2 hover:underline ${FOCUS}`}>Clear filters</button>}
        </div>
      </section>

      <section aria-live="polite">
        <Notice>{error}</Notice>
        {!shown ? <Spinner /> : (
          <>
            <p className="mb-3 text-sm text-[#14261b]/65">{shown.length} {shown.length === 1 ? 'thing' : 'things'} to do{where ? ` around ${where}` : near && !filtered ? `, near ${near} first` : ''}</p>
            {shown.length === 0 && !error ? (
              <Empty title={filtered ? 'Nothing matches yet' : 'Quiet around here'}>
                <p>{filtered ? 'Try another place or type, or start it yourself.' : 'Be the one who starts something.'}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button tone="aura" onClick={() => setStarter('coffee')}><Zap aria-hidden="true" className="h-4 w-4" /> Start a meetup</Button>
                  {filtered && <Button tone="quiet" onClick={clear}>Clear filters</Button>}
                </div>
              </Empty>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {shown.map((i) => <ExploreCard key={`${i.source}-${i.id}`} item={i} busy={busyId === i.id} onToggle={toggle} />)}
              </div>
            )}
          </>
        )}
      </section>

      <MeetupSheet open={starter !== null} kind={starter ?? undefined} onClose={() => setStarter(null)} />
    </div>
  );
}
