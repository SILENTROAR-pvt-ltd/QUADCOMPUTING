'use client';

import React, { useState } from 'react';
import { Download, ShieldAlert } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { useAdminData } from '../ui/useAdminData';

const input = 'h-9 rounded-lg border border-[#e3e3df] bg-white px-2.5 text-[13px] outline-none focus:border-neutral-900';
const istToday = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
const monthStart = () => `${istToday().slice(0, 7)}-01`;

/** One-click statutory files: consolidated GST by venue and month, and Form C (foreign guests) for FRRO filing. */
export function ExportsCard() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(istToday());
  const [venue, setVenue] = useState('');
  const { data } = useAdminData<{ venues: Array<{ id: string; name: string; compliance: { rooms: number } }> }>('/api/admin/venues', 0);
  const stays = (data?.venues || []).filter((v) => v.compliance.rooms > 0);
  const valid = from && to && from <= to;
  const href = (type: string) => `/api/admin/exports?${new URLSearchParams({ type, from, to, ...(type === 'form_c' && venue ? { venue } : {}) })}`;

  return (
    <Panel title="Statutory exports" note="CSV files for filing. Every export is written to the admin log.">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-[12px] text-neutral-500">From<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={`${input} mt-1 block`} /></label>
        <label className="text-[12px] text-neutral-500">To<input type="date" value={to} min={from} max={istToday()} onChange={(e) => setTo(e.target.value)} className={`${input} mt-1 block`} /></label>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[#ebebe8] p-4">
          <p className="text-[13.5px] font-semibold text-neutral-900">Consolidated GST</p>
          <p className="mt-1 text-[12px] text-neutral-500">Per venue and month: bills, gross, discounts, taxable value, GST collected, total, with each GSTIN.</p>
          <a href={valid ? href('gst') : undefined} aria-disabled={!valid}
            className={`mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0b0b0b] px-3 text-[12.5px] font-semibold text-white hover:bg-neutral-800 ${valid ? '' : 'pointer-events-none opacity-40'}`}>
            <Download className="h-3.5 w-3.5" aria-hidden /> Download GST CSV
          </a>
        </div>
        <div className="rounded-xl border border-[#ebebe8] p-4">
          <p className="text-[13.5px] font-semibold text-neutral-900">Form C · foreign guests</p>
          <p className="mt-1 text-[12px] text-neutral-500">Foreign nationals checked in during the range: passport, visa, country, stay dates and room.</p>
          <select value={venue} onChange={(e) => setVenue(e.target.value)} className={`${input} mt-3 w-full`} aria-label="Venue">
            <option value="">All venues with rooms</option>
            {stays.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <a href={valid ? href('form_c') : undefined} aria-disabled={!valid}
            className={`mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e3e3df] px-3 text-[12.5px] font-semibold text-neutral-900 hover:bg-neutral-50 ${valid ? '' : 'pointer-events-none opacity-40'}`}>
            <Download className="h-3.5 w-3.5" aria-hidden /> Download Form C CSV
          </a>
          <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-700"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> Contains passport details. Keep the file only as long as filing needs it.</p>
        </div>
      </div>
    </Panel>
  );
}
