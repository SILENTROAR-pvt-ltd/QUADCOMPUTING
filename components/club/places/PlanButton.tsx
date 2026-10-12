'use client';

import React, { useRef, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { FOCUS } from '../ui';
import { clubFetch } from '../api';

/** "I'm planning to go": optimistic toggle, rolled back if the server refuses. */
export function PlanButton({ placeId, planning, onChange, size = 'md' }: {
  placeId: string; planning: boolean; onChange?: (planning: boolean) => void; size?: 'sm' | 'md';
}) {
  const [on, setOn] = useState(planning);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  const toggle = async () => {
    if (pending.current) return;
    pending.current = true;
    const next = !on;
    setOn(next);
    setBusy(true);
    const res = await clubFetch(`/places/${placeId}/follow`, { body: { on: next } });
    setBusy(false);
    pending.current = false;
    if (!res.ok) { setOn(!next); return; }
    onChange?.(next);
  };

  const h = size === 'sm' ? 'h-9 px-3.5 text-xs' : 'h-11 px-5 text-sm';
  return (
    <button type="button" onClick={toggle} disabled={busy} aria-pressed={on}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-semibold transition active:scale-95 disabled:opacity-70 ${h} ${on ? 'bg-[#17301f] text-[#f6f4ec]' : 'bg-[#c8da4a] text-[#14261b] hover:bg-[#bccf3b]'} ${FOCUS}`}>
      {on ? <Check aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} /> : <Plus aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />}
      {on ? 'Planning to go' : "I'm planning to go"}
    </button>
  );
}
