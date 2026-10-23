'use client';

import React, { useEffect, useState } from 'react';
import { Clock, MapPin, Phone, Bike } from 'lucide-react';
import { sharedGet } from '@/lib/utils/shared-get';
import { EMPTY_MENU_INFO, type MenuInfo } from '@/lib/services/menu-info/menu-info';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';

const serif = LUXE_SERIF;

interface InfoPayload { info?: MenuInfo; gst_applicable?: boolean | null }

// One request feeds both hooks: the menu page and the order review ask for the same thing at the same moment.
const infoUrl = (venueId: string) => `/api/guest/menu/info?cafe_id=${encodeURIComponent(venueId)}`;

/** The venue's public information, loaded once for the menu page. Empty until it arrives. */
export function useMenuInfo(venueId: string): MenuInfo {
  const [info, setInfo] = useState<MenuInfo>(EMPTY_MENU_INFO);
  useEffect(() => {
    if (!venueId) return;
    let alive = true;
    sharedGet<InfoPayload>(infoUrl(venueId)).then((res) => {
      if (alive && res.ok && res.data?.info) setInfo({ ...EMPTY_MENU_INFO, ...res.data.info });
    });
    return () => { alive = false; };
  }, [venueId]);
  return info;
}

/** Whether this venue charges GST on a bill: true or false once known, null while loading or when it could not be read. */
export function useVenueGst(venueId: string): boolean | null {
  const [applicable, setApplicable] = useState<boolean | null>(null);
  useEffect(() => {
    if (!venueId) return;
    let alive = true;
    sharedGet<InfoPayload>(infoUrl(venueId)).then((res) => {
      if (alive && res.ok && typeof res.data?.gst_applicable === 'boolean') setApplicable(res.data.gst_applicable);
    });
    return () => { alive = false; };
  }, [venueId]);
  return applicable;
}
function InfoTile({ icon: Icon, label, children }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3.5 rounded-[20px] border border-[#e8dfcc] bg-[#f8f4ea] p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0f2a1e] text-[#d9c193] ring-2 ring-[#fbf9f4]">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-[9.5px] font-semibold uppercase tracking-[0.24em] text-[#8a6d3f]">{label}</p>
        <div className="mt-1 text-[17px] leading-relaxed text-[#10231a]" style={serif}>{children}</div>
      </div>
    </div>
  );
}

/** "Good to know": timings, delivery, address, phones and the house notes. Renders nothing when empty. */
export function MenuInfoPanel({ info }: { info: MenuInfo }) {
  const hasAny = info.address || info.delivery || info.phones.length || info.timings.length || info.notes.length;
  if (!hasAny) return null;

  return (
    <section aria-labelledby="good-to-know" className="rounded-[28px] border border-[#e8dfcc] bg-[#fbf9f4] p-5 shadow-[0_24px_50px_-40px_rgba(16,35,26,0.5)] sm:p-7">
      <header className="mb-5 flex flex-col gap-1">
        <p className="flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8a6d3f] before:h-px before:w-6 before:bg-[#b08d57]">Venue information</p>
        <h2 id="good-to-know" className="text-[2rem] font-light leading-tight text-[#10231a] sm:text-[2.4rem]" style={serif}>Good to <em className="font-normal text-[#8a6d3f]">know</em></h2>
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
              <a key={p} href={`tel:${p.replace(/[^+\d]/g, '')}`} className="block tabular-nums text-[#10231a] transition-colors hover:text-[#8a6d3f]">{p}</a>
            ))}
          </InfoTile>
        )}
      </div>

      {info.notes.length > 0 && (
        <div className="mt-6 border-t border-[#e8dfcc] pt-5">
          <p className="mb-3 text-[9.5px] font-semibold uppercase tracking-[0.24em] text-[#8a6d3f]">A few notes from the kitchen</p>
          <ol className="space-y-2.5">
            {info.notes.map((n, i) => (
              <li key={n} className="flex gap-3 text-[17px] leading-relaxed text-[#10231a]/85" style={serif}>
                <span className="w-5 shrink-0 text-right text-[15px] italic text-[#b08d57] tabular-nums">{i + 1}.</span>
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
