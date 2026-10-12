'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';
import { Button, Label, Notice, field } from '../ui';
import { Chip, Segmented, Sheet } from '../ui-extra';
import { clubFetch } from '../api';
import { PlacePicker } from '../places/PlacePicker';
import { PhotoUploader, type Photo } from '../PhotoUploader';
import { PhotoTile } from './PhotoTile';
import { readNear } from './useNearPlace';
import type { PlaceRef } from '../places/types';
import { MAX_AHEAD_DAYS, MEETUP_HOURS } from '@/lib/club/meetups/meetup-kinds';
import { MEETUP_TYPES, typeOf } from './explore-meta';

/** A starting line for each kind, so posting takes a few taps. The member can change it. */
const STARTERS: Record<string, string> = {
  coffee: 'Coffee & chai catch-up', food: 'Food crawl', walk: 'Walk-around', party: 'Get-together party', music: 'Live music night',
  sports: 'Game on', dev: 'Developer meet-up', creative: 'Make something together', wellness: 'Morning wellness', together: 'Casual get-together',
};

/** One short word per kind, so five tiles fit across a phone. */
const SHORT: Record<string, string> = { coffee: 'Coffee', food: 'Food', walk: 'Walk', party: 'Party', music: 'Music', sports: 'Sports', dev: 'Dev meet', creative: 'Creative', wellness: 'Wellness', together: 'Together' };

const pad = (n: number) => String(n).padStart(2, '0');
const localInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

/**
 * Start a meetup in seconds: pick a kind, say where, and post. It goes live at once, with no review;
 * anyone can report it afterwards.
 */
export function MeetupForm({ initialKind = 'coffee', onDone }: { initialKind?: string; onDone?: () => void }) {
  const router = useRouter();
  const [kind, setKind] = useState(initialKind);
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [startsAt, setStartsAt] = useState(() => localInput(new Date(Date.now() + 3600_000)));
  const [hours, setHours] = useState<number>(2);
  const [place, setPlace] = useState<PlaceRef | null>(null);
  const [city, setCity] = useState<string>(() => readNear() ?? '');
  const [venue, setVenue] = useState('');
  const [note, setNote] = useState('');
  const [capacity, setCapacity] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const meta = typeOf(kind);

  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await clubFetch('/meetups', {
      body: {
        kind, title: title.trim() || STARTERS[kind], note, venue, hours, capacity, cover_paths: photos.map((p) => p.path),
        city: place ? place.name : city, place_id: place?.id ?? null,
        ...(when === 'now' ? { when: 'now' } : { starts_at: new Date(startsAt).toISOString() }),
      },
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onDone?.();
    router.push(`/club/meetups/${res.data.meetup.id}`);
  };

  return (
    <form onSubmit={post} className="space-y-5" noValidate>
      <div role="group" aria-label="Kind of meetup" className="grid grid-cols-5 gap-2">
        {MEETUP_TYPES.map((t) => <PhotoTile key={t.key} layout="grid" compact type={t.key} label={SHORT[t.key] ?? t.plural} active={kind === t.key} onClick={() => setKind(t.key)} />)}
      </div>

      <Label text="Title"><input data-autofocus className={field} maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={STARTERS[kind]} /></Label>

      <div>
        <p className="text-xs font-semibold text-[#14261b]/80">Photos <span className="font-normal text-[#14261b]/55">· optional, up to 4</span></p>
        <p className="mb-2 mt-0.5 text-xs text-[#14261b]/60">The spot, the vibe, last time. With none, we show a photo that suits {meta.label.toLowerCase()}.</p>
        <PhotoUploader kind="meetups" photos={photos} onChange={setPhotos} max={4} />
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-[#14261b]/80">When</p>
        <Segmented label="When" value={when} options={[['now', 'Right now'], ['later', 'Later']]} onChange={setWhen} />
        {when === 'later' && (
          <input type="datetime-local" aria-label="Start time" className={field} value={startsAt} min={localInput(new Date())}
            max={localInput(new Date(Date.now() + MAX_AHEAD_DAYS * 86_400_000))} onChange={(e) => setStartsAt(e.target.value)} />
        )}
        <div role="group" aria-label="How long" className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#14261b]/60">For</span>
          {MEETUP_HOURS.map((h) => <Chip key={h} active={hours === h} onClick={() => setHours(h)}>{h} {h === 1 ? 'hour' : 'hours'}</Chip>)}
        </div>
      </div>

      <div className="space-y-3">
        <PlacePicker value={place} onChange={setPlace} label="Destination" />
        {!place && <Label text="City" hint="or pick a destination above"><input className={field} maxLength={60} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Where is it?" /></Label>}
        <Label text="Meeting spot" hint="optional"><input className={field} maxLength={120} value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Cafe 1947, Old Manali" /></Label>
      </div>

      <Label text="Anything people should know" hint="optional"><textarea className={`${field} min-h-20`} maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Come as you are. Bring a friend." /></Label>
      <Label text="Spots" hint="leave empty for open"><input className={field} inputMode="numeric" maxLength={3} value={capacity} onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ''))} placeholder="Open" /></Label>

      <p className="rounded-2xl bg-[#f2f0e8] px-4 py-3 text-xs text-[#14261b]/70">
        It goes live straight away, with no review. Meet in public places, and tell someone where you are. Anyone can report a meetup.
      </p>
      <Notice>{error}</Notice>
      <Button type="submit" tone="aura" busy={busy} className="h-12 w-full"><Zap aria-hidden="true" className="h-4 w-4" /> Post {meta.label.toLowerCase()} {when === 'now' ? 'now' : 'meetup'}</Button>
    </form>
  );
}

/** The form in a sheet, with its own open state controlled by the parent. */
export function MeetupSheet({ open, kind, onClose }: { open: boolean; kind?: string; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Start a meetup">
      <MeetupForm key={kind ?? 'coffee'} initialKind={kind} onDone={onClose} />
    </Sheet>
  );
}
