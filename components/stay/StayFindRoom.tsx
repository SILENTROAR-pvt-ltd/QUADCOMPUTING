'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BedDouble, X } from 'lucide-react';
import { RoomLookupForm, rememberedRoom } from '@/components/guest/room/RoomLookupForm';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import { stayButton } from './StayShell';

/**
 * "My room" for a guest who is checked in but not signed in on this phone (checked in at the desk, or on another
 * phone): the last four digits of the mobile given at check-in open their room page, the same proof the room's own QR
 * card asks for (the room number only if two stays share those digits). A phone that already confirmed a room here
 * goes straight to it. `className` styles the button (the forest "live" pill by default).
 */
export function StayFindRoom({ venueId, className = stayButton.live }: { venueId: string; className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [known, setKnown] = useState<{ code: string; number: string } | null>(null);
  useEffect(() => { setKnown(rememberedRoom(venueId)); }, [venueId]);

  const go = (code: string) => router.push(`/room/${encodeURIComponent(code)}`);
  if (known) {
    return <button type="button" onClick={() => go(known.code)} className={className}><BedDouble className="h-4 w-4 shrink-0" aria-hidden /> My room · {known.number}</button>;
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-expanded={open} className={className}><BedDouble className="h-4 w-4 shrink-0" aria-hidden /> My room</button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Open my room" className="fixed inset-0 z-[85] flex items-end justify-center bg-[#08160f]/55 animate-in fade-in duration-150 sm:items-center sm:p-6">
          <div className="fixed inset-0" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-t-[30px] bg-[#fbf9f4] p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:rounded-[30px]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8a6d3f]">Checked in?</p>
                <h3 className="mt-1.5 text-[1.9rem] font-medium leading-tight text-[#10231a]" style={LUXE_SERIF}>Open my room</h3>
                <p className="mt-1 text-sm leading-relaxed text-[#10231a]/65">The last four digits of the mobile given at check-in. Your bill, room service and the desk are on your room page.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-[#f5f1e8] text-[#0f2a1e] ring-1 ring-[#e8dfcc]"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-5"><RoomLookupForm cafeId={venueId} askRoom={false} onFound={(r) => go(r.code)} /></div>
            <p className="mt-3 text-center text-[11px] text-[#10231a]/45">Not checked in yet? Reserve a room above, or use the check-in link the desk sent you.</p>
          </div>
        </div>
      )}
    </>
  );
}
