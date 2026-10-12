import React from 'react';
import Link from 'next/link';
import { BadgeCheck, Check, Clock, MapPin } from 'lucide-react';
import { Avatar, FOCUS } from '../ui';
import { Faces } from '../ui-extra';
import { rupees } from '../api';
import { CLUB_DISPLAY } from '../fonts';
import { moodPhoto, typePhoto } from '../photos';
import type { ExploreItem } from '@/lib/club/explore/explore-filter';
import { typeOf, whenText } from './explore-meta';

/** The label for something of yours that is not simply live. */
const STATUS: Record<string, string> = { draft: 'Draft', submitted: 'In review', rejected: 'Changes requested', cancelled: 'Cancelled', completed: 'Completed', ended: 'Ended' };
const CLOSED = new Set(['cancelled', 'completed', 'ended']);

const PLAN_MOOD: Record<string, string> = { trip: 'tour', event: 'event', together: 'short_plan' };

/** The host's own photo first; otherwise a picture that suits the type. */
export function itemPhoto(item: Pick<ExploreItem, 'cover' | 'source' | 'type' | 'id'>) {
  if (item.cover) return item.cover;
  return item.source === 'plan' && item.type === 'trip' ? moodPhoto(PLAN_MOOD.trip, item.id, 900) : typePhoto(item.type, 720);
}

/**
 * One thing to do, led by a photo with the title set over it. A meetup also has an "I'm in" button right
 * on the card; a trip or event opens its page.
 */
function ExploreCardView({ item, busy, onToggle }: { item: ExploreItem; busy?: boolean; onToggle: (item: ExploreItem) => void }) {
  const meta = typeOf(item.type);
  const Icon = meta.icon;
  const href = item.source === 'meetup' ? `/club/meetups/${item.id}` : `/club/events/${item.id}`;
  const status = item.status ? STATUS[item.status] : undefined;
  const closed = CLOSED.has(item.status ?? '');
  const spots = item.capacity != null && item.capacity > 0 ? Math.max(0, item.capacity - item.going) : null;

  return (
    <article className="group overflow-hidden rounded-[28px] bg-[#fbfaf6] shadow-[0_20px_44px_-30px_rgba(20,38,27,0.6)] ring-1 ring-[#14261b]/[0.05] transition hover:-translate-y-0.5 hover:shadow-[0_26px_50px_-30px_rgba(20,38,27,0.7)]">
      <Link href={href} className={`relative block h-56 overflow-hidden bg-[#17301f] ${FOCUS}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={itemPhoto(item)} alt="" loading="lazy" decoding="async" className={`absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105 ${closed ? 'grayscale' : ''}`} />
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/25" />
        <span className="absolute left-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#14261b] backdrop-blur-sm"><Icon aria-hidden="true" className="h-3.5 w-3.5" />{meta.label}</span>
        {status &&<span className="absolute left-3.5 top-12 rounded-full bg-amber-100/95 px-3 py-1 text-xs font-semibold text-amber-900">{status}</span>}
        {item.live && <span className="absolute right-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-full bg-[#14261b] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#c8da4a]"><span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c8da4a]" />Live</span>}
        {item.verified && !item.live && <span className="absolute right-3.5 top-3.5 grid h-8 w-8 place-items-center rounded-full bg-[#c8da4a] text-[#14261b]" title="Verified plan"><BadgeCheck aria-hidden="true" className="h-4 w-4" /></span>}
        <span className="absolute inset-x-4 bottom-4 text-white">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#e2ee9a]"><Clock aria-hidden="true" className="h-3.5 w-3.5" />{whenText(item)}</span>
          <span className={`${CLUB_DISPLAY} mt-1 line-clamp-2 block text-[25px] font-semibold leading-[1.1]`}>{item.title}</span>
        </span>
      </Link>

      <div className="p-4">
        {item.location && <p className="flex items-center gap-1.5 text-[13px] font-medium text-[#14261b]/80"><MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[#3c6b2b]" /><span className="truncate">{item.location}</span></p>}
        {item.note && <p className="mt-1.5 line-clamp-2 text-[13px] text-[#14261b]/65">{item.note}</p>}
        <div className="mt-3.5 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {item.going > 0 ? <Faces people={item.faces} total={item.going} size={26} ring="ring-[#fbfaf6]" /> : <p className="text-xs text-[#14261b]/60">Be the first in</p>}
            <p className="mt-1 truncate text-xs text-[#14261b]/65">
              {item.going > 0 && <>{item.going} going{spots != null ? ` · ${spots} left` : ''} · </>}
              {item.host ? <span className="inline-flex items-center gap-1 align-middle"><Avatar url={item.host.avatar_url} name={item.host.name} size={14} />{item.host.name}</span> : null}
              {item.price > 0 && <span className="font-semibold text-[#14261b]"> · {rupees(item.price)}</span>}
            </p>
          </div>
          {item.source === 'meetup' && !closed && (
            item.me.hosting
              ? <span className="shrink-0 rounded-full bg-[#e1efe3] px-3.5 py-2 text-xs font-bold text-[#2f5d1f]">Hosting</span>
              : <button type="button" disabled={busy || (item.full && !item.me.going)} onClick={() => onToggle(item)} aria-pressed={item.me.going}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold transition active:scale-95 disabled:opacity-60 ${FOCUS} ${item.me.going ? 'bg-[#17301f] text-[#f6f4ec]' : 'bg-[#c8da4a] text-[#14261b] shadow-[0_12px_24px_-14px_rgba(120,140,20,0.9)] hover:bg-[#bccf3b]'}`}>
                  {item.me.going ? <><Check aria-hidden="true" className="h-4 w-4 text-[#c8da4a]" strokeWidth={3} />Going</> : item.full ? 'Full' : <>I&apos;m in</>}
                </button>
          )}
        </div>
      </div>
    </article>
  );
}

/** Memoised: typing in the search box or toggling one card leaves every other card alone. */
export const ExploreCard = React.memo(ExploreCardView);
