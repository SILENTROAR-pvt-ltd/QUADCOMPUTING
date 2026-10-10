'use client';

import React, { useEffect, useState } from 'react';
import { Clock, MapPin, Phone, Bike } from 'lucide-react';
import { apiRequest } from '@/lib/utils/api-client';
import { EMPTY_MENU_INFO, type MenuInfo } from '@/lib/services/menu-info/menu-info';

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };

/** The venue's public information, loaded once for the menu page. Empty until it arrives. */
export function useMenuInfo(venueId: string): MenuInfo {
  const [info, setInfo] = useState<MenuInfo>(EMPTY_MENU_INFO);
  useEffect(() => {
    if (!venueId) return;
    let alive = true;
    apiRequest<any>(`/api/guest/menu/info?cafe_id=${encodeURIComponent(venueId)}`, { cache: 'no-store' }).then((res) => {
      if (alive && res.ok && res.data?.info) setInfo(res.data.info);
    });
    return () => { alive = false; };
  }, [venueId]);
  return info;
}

function InfoTile({ icon: Icon, label, children }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3.5 rounded-2xl border border-zinc-200/80 bg-white p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#FBF4E2] text-[#7A6230] ring-1 ring-[#E4D5B0]">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400">{label}</p>
        <div className="mt-1 text-[15px] leading-relaxed text-zinc-800" style={serif}>{children}</div>
      </div>
    </div>
  );
}

/** "Good to know": timings, delivery, address, phones and the house notes. Renders nothing when empty. */
export function MenuInfoPanel({ info }: { info: MenuInfo }) {
  const hasAny = info.address || info.delivery || info.phones.length || info.timings.length || info.notes.length;
  if (!hasAny) return null;

  return (
    <section aria-labelledby="good-to-know" className="rounded-3xl border border-zinc-200/80 bg-white p-5 sm:p-7">
      <header className="mb-5 flex flex-col gap-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[#8A7040]">Venue information</p>
        <h2 id="good-to-know" className="text-2xl text-zinc-950 sm:text-3xl" style={serif}>Good to know</h2>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {info.timings.length > 0 && (
          <InfoTile icon={Clock} label="Kitchen timings">
            {info.timings.map((t) => <p key={t}>{t}</p>)}
          </InfoTile>
        )}
        {info.delivery && (
          <InfoTile icon={Bike} label="Delivery">{info.delivery}</InfoTile>
        )}
        {info.address && (
          <InfoTile icon={MapPin} label="Find us">{info.address}</InfoTile>
        )}
        {info.phones.length > 0 && (
          <InfoTile icon={Phone} label="Call us">
            {info.phones.map((p) => (
              <a key={p} href={`tel:${p.replace(/[^+\d]/g, '')}`} className="block tabular-nums text-zinc-800 transition-colors hover:text-[#7A6230]">{p}</a>
            ))}
          </InfoTile>
        )}
      </div>

      {info.notes.length > 0 && (
        <div className="mt-6 border-t border-zinc-100 pt-5">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400">A few notes from the kitchen</p>
          <ol className="space-y-2.5">
            {info.notes.map((n, i) => (
              <li key={n} className="flex gap-3 text-[15px] leading-relaxed text-zinc-700" style={serif}>
                <span className="w-5 shrink-0 text-right text-sm italic text-[#8A7040] tabular-nums">{i + 1}.</span>
                <span>{n}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

export default MenuInfoPanel;
