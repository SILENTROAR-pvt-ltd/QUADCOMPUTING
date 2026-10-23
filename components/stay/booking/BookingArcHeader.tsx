import React from 'react';
import { BedDouble, X } from 'lucide-react';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import s from '@/components/guest/luxe/luxe-guest.module.css';

interface Props { kicker: string; title: string; detail: string; photo: string | null; onClose: () => void }

/**
 * The top of the reservation sheet, as on an event or a room: the room's photograph drifting under a curved edge, with
 * what is being reserved and the dates over it.
 */
export function BookingArcHeader({ kicker, title, detail, photo, onClose }: Props) {
  return (
    <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#1d4632,#0f2a1e)] [border-radius:0_0_50%_50%/0_0_14%_14%]">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- the venue's own room photo
        <img src={photo} alt="" className={`${s.slowmo} h-full w-full object-cover`} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      ) : (
        <BedDouble aria-hidden className="absolute left-1/2 top-[38%] h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-[#d9c193]/70" />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,22,15,0.45)_0%,transparent_32%,rgba(8,22,15,0.9)_100%)]" />
      <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-[#f5f1e8]/90 text-[#0f2a1e]"><X className="h-4 w-4" /></button>
      <div className="absolute inset-x-0 bottom-0 px-6 pb-8 text-[#f5f1e8]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#d9c193]">{kicker}</p>
        <h2 className="mt-1 text-[2rem] font-medium leading-[1.02] [text-wrap:balance]" style={LUXE_SERIF}>{title}</h2>
        <p className="mt-1 text-[12px] text-[#f5f1e8]/75">{detail}</p>
      </div>
    </div>
  );
}
