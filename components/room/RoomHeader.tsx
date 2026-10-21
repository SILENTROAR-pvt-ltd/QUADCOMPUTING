'use client';

import React from 'react';
import { BadgeCheck, Clock, Users, MoonStar, LogOut, Receipt, BedDouble } from 'lucide-react';
import { inr, plural, titleCase, whenIst } from '@/components/stay/stay-format';
import type { RoomState } from './useRoomStay';

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };

/** The stay at a glance: who, which room, since when, when they leave, what the bill stands at, and whether the kitchen is open now. */
export function RoomHeader({ data, onOpenBill }: { data: RoomState; onOpenBill: () => void }) {
  const { room, dining, folio, business } = data;
  const cover = room.category?.photos?.[0] || null;
  const kitchenOpen = dining.enabled && dining.open;
  const balance = folio?.balance ?? 0;
  // A check-out stored as a date gets the venue's hour under it; one stored as an instant already carries its time.
  const out = room.check_out_time ? whenIst(room.check_out_time) : '';
  const outDate = out.includes(',') && /\d:\d\d/.test(out) ? out.split(',').slice(0, -1).join(',') : out;
  const outTime = /\d:\d\d/.test(out) ? out.split(',').pop()?.trim() : business.checkout_time || undefined;

  const stats = [
    { Icon: MoonStar, label: 'Nights', value: folio ? String(folio.nights) : '—', sub: 'so far' },
    { Icon: LogOut, label: 'Check-out', value: outDate || '—', sub: outTime },
    { Icon: Receipt, label: 'Bill', value: balance > 0 ? inr(balance) : 'Paid', sub: balance > 0 ? 'at checkout' : 'nothing owed', action: onOpenBill },
  ];

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#e6d9b8] bg-white shadow-[0_24px_60px_-36px_rgba(10,50,34,0.5)]">
      <div className="relative h-44 bg-neutral-100 sm:h-64">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- venue photos come from the venue's own storage
          <img src={cover} alt="" className="h-full w-full object-cover" decoding="async" fetchPriority="high" />
        ) : (
          <div className="grid h-full w-full place-items-center text-neutral-300"><BedDouble className="h-12 w-12" aria-hidden /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/30 to-transparent" />
        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-emerald-800 shadow-sm backdrop-blur"><BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Checked in</span>
        <span className={`absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium shadow-sm backdrop-blur ${kitchenOpen ? 'bg-emerald-600/95 text-white' : 'bg-white/90 text-neutral-700'}`}>
          <Clock className="h-3.5 w-3.5" aria-hidden /> {dining.enabled ? dining.message : 'No in-room dining'}
        </span>
      </div>

      <div className="relative -mt-10 px-5 pb-5 sm:-mt-14 sm:px-8 sm:pb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-700">{room.category?.name || 'Your room'} · Room {room.room_number}</p>
        <h2 className="mt-1.5 text-3xl font-semibold leading-tight tracking-tight text-neutral-950 sm:text-[2.75rem]" style={serif}>
          {room.guest_first_name ? `Welcome, ${titleCase(room.guest_first_name)}` : `Room ${room.room_number}`}
        </h2>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-500">
          <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" aria-hidden /> {plural(room.total_guests, 'guest')}</span>
          {room.check_in_time && <span className="inline-flex items-center gap-1.5"><MoonStar className="h-3.5 w-3.5" aria-hidden /> Since {whenIst(room.check_in_time)}</span>}
          <span>{business.name}</span>
        </div>

        <ul className="mt-5 grid grid-cols-3 gap-2">
          {stats.map(({ Icon, label, value, sub, action }) => {
            const inner = (
              <>
                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500"><Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /><span className="truncate">{label}</span></span>
                <span className={`mt-1 block truncate text-[15px] font-semibold ${value === 'Paid' ? 'text-emerald-700' : 'text-neutral-950'}`}>{value}</span>
                {sub && <span className="block truncate text-[11px] text-neutral-500">{sub}</span>}
              </>
            );
            const cls = 'block w-full rounded-2xl border border-neutral-200/80 bg-[#faf9f6] px-3 py-2.5 text-left';
            return <li key={label}>{action ? <button type="button" onClick={action} className={`${cls} cursor-pointer transition hover:border-neutral-900`}>{inner}</button> : <div className={cls}>{inner}</div>}</li>;
          })}
        </ul>
      </div>
    </section>
  );
}
