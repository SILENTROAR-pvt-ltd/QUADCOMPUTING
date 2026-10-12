'use client';

import React, { useRef, useState } from 'react';
import { Check, UserPlus } from 'lucide-react';
import { FOCUS } from '../ui';
import { clubFetch } from '../api';

/** Follow or unfollow a member. Optimistic, and rolled back if the server refuses. */
export function FollowButton({ memberId, following, onChange, size = 'md' }: {
  memberId: string; following: boolean; onChange?: (following: boolean) => void; size?: 'sm' | 'md';
}) {
  const [on, setOn] = useState(following);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  const toggle = async () => {
    if (pending.current) return;
    pending.current = true;
    const next = !on;
    setOn(next);
    setBusy(true);
    const res = await clubFetch(`/members/${memberId}/follow`, { body: { on: next } });
    setBusy(false);
    pending.current = false;
    if (!res.ok) { setOn(!next); return; }
    onChange?.(next);
  };

  const h = size === 'sm' ? 'h-9 px-4 text-xs' : 'h-12 px-6 text-sm';
  return (
    <button type="button" onClick={toggle} disabled={busy} aria-pressed={on}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition active:scale-95 disabled:opacity-70 ${h} ${on ? 'bg-white text-[#14261b] ring-1 ring-[#14261b]/15 hover:bg-[#f2f0e8]' : 'bg-[#17301f] text-[#f6f4ec] hover:bg-[#22432c]'} ${FOCUS}`}>
      {on ? <Check aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} /> : <UserPlus aria-hidden="true" className="h-4 w-4" />}
      {on ? 'Following' : 'Follow'}
    </button>
  );
}
