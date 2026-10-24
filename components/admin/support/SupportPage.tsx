'use client';

import React, { useState } from 'react';
import { Panel, Empty, ErrorNote } from '../ui/Panel';
import { dateShort } from '../ui/format';
import { useAdminData } from '../ui/useAdminData';
import { TicketItem, type Ticket } from './TicketItem';

interface Stay { id: string; venue: string; phone: string | null; room: string; guest: string | null; checkIn: string | null; checkOut: string | null; overdue: boolean; checkoutAsked: boolean; lateAsked: boolean }
interface SupportAnswer { ready: boolean; tickets: Ticket[]; stays: Stay[] }

const FILTERS = [{ id: '', label: 'All' }, { id: 'open', label: 'Open' }, { id: 'in_progress', label: 'In progress' }, { id: 'resolved', label: 'Resolved' }];

/** /admin/support: tickets from venues (urgent first) and every occupied room, overdue stays first. */
export function SupportPage() {
  const [status, setStatus] = useState('');
  const { data, error, refresh } = useAdminData<SupportAnswer>(`/api/admin/support${status ? `?status=${status}` : ''}`, 30_000);
  const flagged = (data?.stays || []).filter((s) => s.overdue || s.checkoutAsked || s.lateAsked).length;

  return (
    <div className="space-y-5">
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="grid gap-5 xl:grid-cols-5">
        <Panel title="Support tickets" note="Raised by venue owners from My profile" className="xl:col-span-3"
          actions={<div className="flex gap-1 rounded-lg border border-[#e3e3df] p-0.5">{FILTERS.map((f) => (
            <button key={f.id} type="button" onClick={() => setStatus(f.id)} className={`rounded-md px-2.5 py-1 text-[12px] font-semibold cursor-pointer ${status === f.id ? 'bg-[#0b0b0b] text-white' : 'text-neutral-600'}`}>{f.label}</button>
          ))}</div>}>
          {!data ? <Empty>Loading…</Empty>
            : !data.ready ? <Empty>Tickets start once supabase/apply-pending-2026-10-24c.sql is applied.</Empty>
            : data.tickets.length === 0 ? <Empty>No tickets here.</Empty>
            : <ul className="space-y-2">{data.tickets.map((t) => <TicketItem key={t.id} t={t} onSaved={() => void refresh()} />)}</ul>}
        </Panel>
        <Panel title="Live stays" note={`${data?.stays.length ?? 0} rooms occupied · ${flagged} need a look`} className="xl:col-span-2">
          {!data ? <Empty>Loading…</Empty> : data.stays.length === 0 ? <Empty>No room is occupied right now.</Empty> : (
            <ul className="divide-y divide-[#f0f0ed]">
              {data.stays.map((s) => (
                <li key={s.id} className="py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold text-neutral-900">{s.venue} · Room {s.room}</span>
                      <span className="block text-[11px] text-neutral-500">{s.guest || 'Guest'} · {dateShort(s.checkIn)} → {dateShort(s.checkOut)}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      {s.overdue && <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10.5px] font-semibold text-rose-700">Past check-out</span>}
                      {s.checkoutAsked && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-800">Asked to check out</span>}
                      {s.lateAsked && <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10.5px] font-semibold text-sky-800">Late check-out asked</span>}
                    </span>
                  </div>
                  {(s.overdue || s.checkoutAsked) && s.phone && <a href={`tel:${s.phone}`} className="mt-1 inline-block text-[12px] font-semibold text-[#2a78d6]">Call the desk · {s.phone}</a>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-neutral-500">Check-out and folio changes are made by the venue&apos;s desk, where the payment is taken. Call the desk for a stuck stay.</p>
        </Panel>
      </div>
    </div>
  );
}
