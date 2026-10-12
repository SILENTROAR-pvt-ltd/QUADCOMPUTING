import React from 'react';
import Link from 'next/link';
import { PenLine } from 'lucide-react';
import { CLUB_DISPLAY } from '../fonts';

interface Props {
  bio: string | null;
  /** Your own profile: an empty bio becomes an invitation to write one. */
  self?: boolean;
  onEdit?: () => void;
  editHref?: string;
}

const EDIT = 'inline-flex items-center gap-2 text-sm font-semibold text-[#3c6b2b] hover:underline';

/** A few lines the member wrote about themself. There is no preset text: with no bio, others see nothing. */
export function BioCard({ bio, self, onEdit, editHref }: Props) {
  if (!bio && !self) return null;
  return (
    <section aria-label="About" className="rounded-[28px] border border-white/70 bg-white/45 px-6 py-5 text-center shadow-[0_24px_60px_-42px_rgba(20,38,27,0.5)] backdrop-blur-xl">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14261b]/55">About</h3>
      {bio ? (
        <p className={`${CLUB_DISPLAY} mt-3 whitespace-pre-line text-[18px] leading-relaxed text-[#14261b]/85`}>{bio}</p>
      ) : (
        <p className="mt-3 text-sm text-[#14261b]/60">Add a few lines about you, so people know who they are meeting.</p>
      )}
      {self && (
        <div className="mt-3">
          {editHref
            ? <Link href={editHref} className={EDIT}><PenLine aria-hidden="true" className="h-4 w-4" />{bio ? 'Edit bio' : 'Write your bio'}</Link>
            : <button type="button" onClick={onEdit} className={EDIT}><PenLine aria-hidden="true" className="h-4 w-4" />{bio ? 'Edit bio' : 'Write your bio'}</button>}
        </div>
      )}
    </section>
  );
}
