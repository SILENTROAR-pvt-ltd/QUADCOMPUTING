'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BedDouble, X } from 'lucide-react';
import { RoomLookupForm, rememberedRoom } from '@/components/guest/room/RoomLookupForm';
import { stayButton } from './StayShell';

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };

/**
 * "My room" for a guest who is checked in but not signed in on this phone (checked in at the desk, or on another
 * phone): the last four digits of the mobile given at check-in open their room page, the same proof the room's own QR
 * card asks for (the room number only if two stays share those digits). A phone that already confirmed a room here
 * goes straight to it.
 */
export function StayFindRoom({ venueId }: { venueId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [known, setKnown] = useState<{ code: string; number: string } | null>(null);
  useEffect(() => { setKnown(rememberedRoom(venueId)); }, [venueId]);

  const go = (code: string) => router.push(`/room/${encodeURIComponent(code)}`);
  if (known) {
    return <button type="button" onClick={() => go(known.code)} className={stayButton.live}><BedDouble className="h-4 w-4" aria-hidden /> My room · {known.number}</button>;
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-expanded={open} className={stayButton.live}><BedDouble className="h-4 w-4" aria-hidden /> My room</button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Open my room" className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-950/40 backdrop-blur-sm animate-in fade-in duration-150 sm:items-center sm:p-6">
          <div className="fixed inset-0" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-t-[2rem] border border-[#e6d9b8] bg-[#faf9f6] p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:rounded-[2rem]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-800">Checked in?</p>
                <h3 className="mt-1.5 text-2xl font-medium text-neutral-950" style={serif}>Open my room</h3>
                <p className="mt-1 text-sm text-neutral-600">The last four digits of the mobile given at check-in. Your bill, room service and the desk are on your room page.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full bg-white text-neutral-500 ring-1 ring-neutral-200 hover:text-neutral-950"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-5"><RoomLookupForm cafeId={venueId} askRoom={false} onFound={(r) => go(r.code)} /></div>
            <p className="mt-3 text-center text-[11px] text-neutral-400">Not checked in yet? Reserve a room above, or use the check-in link the desk sent you.</p>
          </div>
        </div>
      )}
    </>
  );
}
