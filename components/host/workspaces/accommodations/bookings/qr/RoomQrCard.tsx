'use client';

import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Download, ExternalLink, Printer } from 'lucide-react';
import type { PhysicalRoom } from '@/types';
import { downloadRoomQrPng, printRoomPlacards } from './room-placard';

interface Props { room: PhysicalRoom; url: string; venue: string; onToast: (msg: string) => void; register: (roomId: string, svg: SVGSVGElement | null) => void }

const btn = 'inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 text-[11px] font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50';

/** One room's QR: the code itself, its link, and the three things to do with it: download, print, copy. */
export function RoomQrCard({ room, url, venue, onToast, register }: Props) {
  const ref = useRef<SVGSVGElement | null>(null);
  const [busy, setBusy] = useState(false);
  const setRef = (el: SVGSVGElement | null) => { ref.current = el; register(room.id, el); };

  const download = async () => {
    if (!ref.current) return;
    setBusy(true);
    try { await downloadRoomQrPng(ref.current, room.room_number); onToast(`Room ${room.room_number} QR downloaded.`); }
    catch { onToast('The QR could not be prepared. Try again.'); }
    finally { setBusy(false); }
  };

  return (
    <li className="flex gap-3 rounded-2xl border border-neutral-200 bg-white p-3">
      <span className="shrink-0 rounded-xl border border-neutral-200 bg-white p-1.5">
        <QRCodeSVG ref={setRef} value={url} size={104} level="H" includeMargin={false} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-sm font-bold text-neutral-950">Room {room.room_number}</p>
        <p className="truncate text-[11px] text-neutral-500">{room.category?.name || 'Room'}</p>
        <p className="mt-1 truncate font-mono text-[11px] text-neutral-500" title={url}>{url.replace(/^https?:\/\//, '')}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button type="button" disabled={busy} onClick={() => void download()} className={btn}><Download className="h-3.5 w-3.5" aria-hidden /> PNG</button>
          <button type="button" onClick={() => printRoomPlacards([{ roomNumber: room.room_number, categoryName: room.category?.name, url, svg: ref.current }], venue)} className={btn}><Printer className="h-3.5 w-3.5" aria-hidden /> Placard</button>
          <button type="button" onClick={() => { void navigator.clipboard.writeText(url); onToast(`Room ${room.room_number} link copied.`); }} className={btn}><Copy className="h-3.5 w-3.5" aria-hidden /> Link</button>
          <a href={url} target="_blank" rel="noreferrer" className={btn} aria-label={`Open room ${room.room_number} page`}><ExternalLink className="h-3.5 w-3.5" aria-hidden /></a>
        </div>
      </div>
    </li>
  );
}
