import React from 'react';
import { CLUB_DISPLAY } from '../fonts';

interface Props {
  followers: number;
  hosted: number;
  joined: number;
  onOpenFollowers?: () => void;
}

const NUM = `${CLUB_DISPLAY} text-[26px] font-semibold leading-none tabular-nums text-[#14261b]`;
const LABEL = 'text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14261b]/55';
const CELL = 'flex flex-col items-center gap-1.5 px-6 sm:px-8';

/** Followers, plans hosted and plans joined as one quiet line under the name: serif numbers, spaced labels. */
export function ProfileFigures({ followers, hosted, joined, onOpenFollowers }: Props) {
  return (
    <div role="group" aria-label="Profile figures" className="mt-5 flex items-stretch justify-center divide-x divide-[#14261b]/10">
      <button type="button" onClick={onOpenFollowers} className={`${CELL} transition hover:opacity-70`}>
        <span className={NUM}>{followers}</span><span className={LABEL}>Followers</span>
      </button>
      <div className={CELL}><span className={NUM}>{hosted}</span><span className={LABEL}>Hosted</span></div>
      <div className={CELL}><span className={NUM}>{joined}</span><span className={LABEL}>Joined</span></div>
    </div>
  );
}
