'use client';

import React, { useRef, useState } from 'react';
import { ChevronDown, Printer, QrCode } from 'lucide-react';
import type { PhysicalRoom } from '@/types';
import { RoomQrCard } from './RoomQrCard';
import { printRoomPlacards } from './room-placard';

interface Props { rooms: PhysicalRoom[]; origin: string; venue: string; onToast: (msg: string) => void }

/**
 * Every room's QR card, the way it goes in the room: the code, the link, PNG and placard per room, and one print run
 * for all of them. A room gets its link when it is created; an older room gets one the first time a guest opens it.
 */
export function RoomQrLinks({ rooms, origin, venue, onToast }: Props) {
  const [open, setOpen] = useState(true);
  const svgs = useRef(new Map<string, SVGSVGElement | null>());
  const linked = rooms.filter((r) => r.qr_code_hash).sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }));
  const pending = rooms.length - linked.length;
  const urlFor = (r: PhysicalRoom) => `${origin}/room/${encodeURIComponent(r.qr_code_hash as string)}`;
  const printAll = () => printRoomPlacards(linked.map((r) => ({ roomNumber: r.room_number, categoryName: r.category?.name, url: urlFor(r), svg: svgs.current.get(r.id) || null })), venue);

  return (
    <section className="mt-4 rounded-2xl border border-neutral-200" aria-label="Room QR codes">
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-neutral-900">
          <QrCode className="h-4 w-4" aria-hidden /> Room QR codes ({linked.length}) <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        </button>
        {linked.length > 0 && (
          <button type="button" onClick={printAll} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-neutral-950 px-3 text-[11px] font-semibold text-white hover:bg-neutral-800">
            <Printer className="h-3.5 w-3.5" aria-hidden /> Print all placards
          </button>
        )}
      </div>
      {open && (
        <div className="border-t border-neutral-100 p-3.5">
          <p className="mb-3 text-xs text-neutral-500">Each card opens that room&apos;s page: ordering to the room, the bill, the desk, check-out. Print the placard for the room, or download the PNG for your own design.</p>
          {linked.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-200 p-4 text-center text-xs text-neutral-500">No room links yet. Add a room above and its QR appears here.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {linked.map((r) => <RoomQrCard key={r.id} room={r} url={urlFor(r)} venue={venue} onToast={onToast} register={(id, svg) => { svgs.current.set(id, svg); }} />)}
            </ul>
          )}
          {pending > 0 && <p className="mt-3 text-[11px] text-neutral-500">{pending} older room{pending === 1 ? ' has' : 's have'} no link yet; one is made the first time that room&apos;s page is opened.</p>}
        </div>
      )}
    </section>
  );
}
