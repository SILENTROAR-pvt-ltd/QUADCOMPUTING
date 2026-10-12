'use client';

import React from 'react';
import { BadgeCheck, Pencil } from 'lucide-react';
import { Avatar, FOCUS } from '../ui';
import { GENERATION_LABEL } from '../api';
import { CLUB_DISPLAY } from '../fonts';
import { DriftPhoto } from '../LivePhotos';
import { photoUrl, PROFILE_BANNERS } from '../photos';
import { KIND_META } from './traveler-kinds';
import { ProfileFigures } from './ProfileFigures';
import { SocialLogos } from './SocialLogos';
import type { MemberProfileData } from './types';

function bannerFor(userId: string) {
  let h = 0;
  for (const ch of userId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return photoUrl(PROFILE_BANNERS[h % PROFILE_BANNERS.length], 1600);
}

/**
 * The top of a profile: a landscape that dissolves into the page, the face, the name in the editorial
 * serif, the traveller types as quiet tags, the social logos, and the vibe line.
 */
export function ProfileHero({ data, onPhoto, photoBusy, onOpenNetwork }: {
  data: MemberProfileData; onPhoto?: () => void; photoBusy?: boolean; onOpenNetwork?: (list: 'followers' | 'following') => void;
}) {
  const m = data.member;
  const joined = new Date(data.since).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const type = m.account_type === 'business' ? data.business_name || 'Business' : 'Viber';
  return (
    <header className="text-center">
      <div className="relative -mx-4 h-60 sm:mx-0 sm:h-72">
        <DriftPhoto src={bannerFor(m.user_id)} className="absolute inset-0 h-full w-full overflow-hidden rounded-b-[44px] sm:rounded-[44px]" />
        <span aria-hidden="true" className="absolute inset-0 rounded-b-[44px] bg-gradient-to-b from-black/15 via-transparent to-[#f1efe6] sm:rounded-[44px]" />
      </div>

      <div className="relative -mt-[72px] flex flex-col items-center px-2">
        <div className="relative">
          <span className="block rounded-full bg-[#f1efe6] p-1.5 shadow-[0_24px_50px_-22px_rgba(20,38,27,0.7)]">
            <Avatar url={m.avatar_url} name={m.name} size={124} />
          </span>
          {data.online && !onPhoto && <span className="absolute bottom-3 right-3 h-4 w-4 rounded-full border-[3px] border-[#f1efe6] bg-[#2f9e57]" title="Online now" />}
          {onPhoto && (
            <button type="button" onClick={onPhoto} disabled={photoBusy} aria-label="Change photo"
              className={`absolute bottom-1 right-1 grid h-10 w-10 place-items-center rounded-full border-[3px] border-[#f1efe6] bg-[#17301f] text-[#c8da4a] transition hover:bg-[#22432c] disabled:opacity-60 ${FOCUS}`}>
              <Pencil aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </div>

        <h2 className={`${CLUB_DISPLAY} mt-4 flex items-center justify-center gap-2 text-[38px] font-semibold leading-none tracking-tight sm:text-[44px]`}>
          <span className="truncate">{m.name}</span>
          <BadgeCheck aria-label="Verified member" className="h-6 w-6 shrink-0 fill-[#c8da4a] text-[#17301f]" />
        </h2>
        {m.handle && <p className="mt-2 text-sm font-semibold tracking-wide text-[#14261b]/70">@{m.handle}</p>}

        <ProfileFigures followers={data.network.followers} hosted={data.stats.hosted} joined={data.stats.joined} onOpenFollowers={() => onOpenNetwork?.('followers')} />

        <p className="mt-5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3c6b2b]">
          <span>{m.city}</span><span aria-hidden="true" className="text-[#14261b]/25">/</span>
          <span>{GENERATION_LABEL[m.generation]}</span><span aria-hidden="true" className="text-[#14261b]/25">/</span>
          <span>{type}</span>
        </p>

        {data.details.kinds.length > 0 && (
          <ul className="mt-5 flex max-w-md flex-wrap justify-center gap-2" aria-label="Traveller types">
            {data.details.kinds.map((k) => {
              const meta = KIND_META[k];
              const Icon = meta.icon;
              return (
                <li key={k} className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3.5 py-2 text-xs font-medium text-[#14261b] ring-1 ring-[#14261b]/10 backdrop-blur">
                  <Icon aria-hidden="true" className="h-3.5 w-3.5 text-[#3c6b2b]" strokeWidth={1.8} />{meta.label}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-5"><SocialLogos links={data.details.social} /></div>

        {m.vibe_line && <p className={`${CLUB_DISPLAY} mx-auto mt-5 max-w-md text-[21px] italic leading-snug text-[#14261b]/80`}>“{m.vibe_line}”</p>}
        <p className="mt-3 text-xs text-[#14261b]/55">
          Member since {joined}{data.online ? ' · online now' : ''}
        </p>
      </div>
    </header>
  );
}
