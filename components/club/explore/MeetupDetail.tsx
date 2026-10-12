'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Clock, MapPin, MessageSquare, Share2 } from 'lucide-react';
import { Avatar, Button, FOCUS, Notice, Spinner } from '../ui';
import { clubFetch } from '../api';
import { CLUB_DISPLAY } from '../fonts';
import { ReportButton } from '../ReportButton';
import type { ExploreItem } from '@/lib/club/explore/explore-filter';
import { typePhoto } from '../photos';
import { typeOf, whenText } from './explore-meta';

type Meetup = ExploreItem & { source: 'meetup'; kind: string; covers: string[]; status: 'open' | 'cancelled'; place_id: string | null; venue: string | null; city: string; host: { user_id: string; name: string; handle: string | null; avatar_url: string | null } | null };
interface Attendee { user_id: string; name: string; handle: string | null; avatar_url: string | null; host: boolean }

function length(start: string, end: string) {
  const hours = Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 3600_000));
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

/** One meetup: when and where, the host, everyone who is in, and "I'm in". The host can cancel it. */
export function MeetupDetail({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<{ meetup: Meetup; attendees: Attendee[] } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    const res = await clubFetch<{ meetup: Meetup; attendees: Attendee[] }>(`/meetups/${id}`);
    if (res.ok) { setData(res.data); setError(''); } else setError(res.error);
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  const act = async (action: 'join' | 'leave' | 'cancel') => {
    if (action === 'cancel' && !window.confirm('Cancel this meetup? Everyone who is in will be told.')) return;
    setBusy(true);
    setNotice('');
    const res = await clubFetch(`/meetups/${id}`, { body: { action } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setError('');
    await load();
  };

  const message = async (hostId: string) => {
    setBusy(true);
    const res = await clubFetch('/rooms/dm', { body: { user_id: hostId } });
    setBusy(false);
    if (res.ok) router.push(`/club/chat/${res.data.roomId}`); else setError(res.error);
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: data?.meetup.title, url });
      else { await navigator.clipboard.writeText(url); setNotice('Link copied.'); }
    } catch { /* the member closed the share sheet */ }
  };

  if (error && !data) return <Notice>{error}</Notice>;
  if (!data) return <Spinner />;

  const m = data.meetup;
  const meta = typeOf(m.kind);
  const Icon = meta.icon;
  const ended = Date.parse(m.ends_at) <= Date.now();
  const cancelled = m.status === 'cancelled';
  const closed = ended || cancelled;
  const spots = m.capacity != null ? Math.max(0, m.capacity - m.going) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <article className="overflow-hidden rounded-[32px] bg-[#fbfaf6] shadow-[0_24px_54px_-34px_rgba(20,38,27,0.65)] ring-1 ring-[#14261b]/[0.05]">
        <div className="relative h-60 overflow-hidden bg-[#17301f]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.covers[0] || typePhoto(m.kind, 900)} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/25" />
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold backdrop-blur"><Icon aria-hidden="true" className="h-3.5 w-3.5" />{meta.label}</span>
          <span className="absolute right-4 top-4 flex gap-1.5">
            {m.live && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#14261b] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#c8da4a]"><span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c8da4a]" />Live</span>}
            {cancelled && <span className="rounded-full bg-red-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-red-800">Cancelled</span>}
            {ended && !cancelled && <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#14261b]/70">Ended</span>}
          </span>
        </div>

        <div className="space-y-5 p-5 sm:p-7">
          {m.covers.length > 1 && (
            <ul aria-label="More photos" className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
              {m.covers.slice(1).map((src) => (
                <li key={src} className="h-20 w-28 shrink-0 overflow-hidden rounded-2xl bg-[#17301f]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                </li>
              ))}
            </ul>
          )}
          <h2 className={`${CLUB_DISPLAY} text-[32px] font-semibold leading-tight`}>{m.title}</h2>
          <div className="space-y-2 text-[15px]">
            <p className="flex items-center gap-2.5 font-medium text-[#2f5d1f]"><Clock aria-hidden="true" className="h-4 w-4 shrink-0" />{whenText(m)} · {length(m.starts_at, m.ends_at)}</p>
            <p className="flex items-start gap-2.5 text-[#14261b]/80"><MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{m.venue && <span className="font-medium">{m.venue}</span>}{m.venue && ', '}
                {m.place_id ? <Link href={`/club/places/${m.place_id}`} className="underline decoration-[#3c6b2b]/40 underline-offset-2 hover:decoration-[#3c6b2b]">{m.city}</Link> : m.city}</span>
            </p>
          </div>
          {m.note && <p className="whitespace-pre-line rounded-2xl bg-[#f2f0e8] px-4 py-3 text-[15px] leading-relaxed text-[#14261b]/85">{m.note}</p>}

          {m.host && (
            <Link href={`/club/members/${m.host.user_id}`} className={`flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-[#14261b]/[0.06] hover:bg-[#f2f0e8] ${FOCUS}`}>
              <Avatar url={m.host.avatar_url} name={m.host.name} size={44} />
              <span className="min-w-0"><span className="block text-xs text-[#14261b]/60">Hosted by</span>
                <span className="block truncate font-semibold">{m.host.name}{m.host.handle && <span className="font-normal text-[#14261b]/55"> @{m.host.handle}</span>}</span></span>
            </Link>
          )}

          <Notice>{error}</Notice>
          <Notice tone="good">{notice}</Notice>
          <div className="flex flex-wrap items-center gap-2.5">
            {m.me.hosting ? (
              !closed && <Button tone="danger" busy={busy} onClick={() => void act('cancel')} className="h-12 rounded-full px-6">Cancel meetup</Button>
            ) : m.me.going ? (
              <Button tone="ink" busy={busy} disabled={closed} onClick={() => void act('leave')} className="h-12 rounded-full px-6"><Check aria-hidden="true" className="h-4 w-4 text-[#c8da4a]" strokeWidth={3} /> You&apos;re in · Leave</Button>
            ) : (
              <Button tone="aura" busy={busy} disabled={closed || m.full} onClick={() => void act('join')} className="h-12 rounded-full px-8">{m.full ? 'Full' : <>I&apos;m in</>}</Button>
            )}
            {m.host && !m.me.hosting && <Button tone="quiet" busy={busy} onClick={() => void message(m.host!.user_id)} className="h-12 rounded-full"><MessageSquare aria-hidden="true" className="h-4 w-4" /> Message host</Button>}
            <Button tone="quiet" onClick={() => void share()} className="h-12 rounded-full"><Share2 aria-hidden="true" className="h-4 w-4" /> Share</Button>
            {!m.me.hosting && <ReportButton type="meetup" id={m.id} label="Report" />}
          </div>
        </div>
      </article>

      <section aria-labelledby="in-title" className="rounded-[28px] bg-[#fbfaf6] p-5 shadow-[0_18px_40px_-30px_rgba(20,38,27,0.45)] ring-1 ring-[#14261b]/[0.05]">
        <h3 id="in-title" className={`${CLUB_DISPLAY} text-xl font-semibold`}>Who&apos;s in <span className="text-base font-normal text-[#14261b]/55">· {m.going}{spots != null ? ` of ${m.capacity}` : ''}</span></h3>
        <ul className="mt-3 divide-y divide-[#14261b]/[0.06]">
          {data.attendees.map((a) => (
            <li key={a.user_id}>
              <Link href={`/club/members/${a.user_id}`} className={`flex items-center gap-3 rounded-xl py-2.5 ${FOCUS}`}>
                <Avatar url={a.avatar_url} name={a.name} size={38} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{a.name}{a.handle && <span className="font-normal text-[#14261b]/55"> @{a.handle}</span>}</span>
                {a.host && <span className="rounded-full bg-[#e1efe3] px-2.5 py-1 text-[11px] font-bold text-[#2f5d1f]">Host</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
