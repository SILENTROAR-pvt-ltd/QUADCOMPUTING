'use client';

import React, { useState } from 'react';
import { ago } from '../ui/format';
import { adminSend } from '../ui/useAdminData';

export interface Ticket { id: string; venue: string; phone: string | null; subject: string; body: string; category: string; priority: string; status: string; admin_note: string | null; created_at: string }

const PRIORITY: Record<string, string> = { urgent: 'bg-rose-600 text-white', high: 'bg-rose-50 text-rose-700 border border-rose-200', normal: 'bg-neutral-100 text-neutral-700', low: 'bg-neutral-50 text-neutral-500' };
const STATUS: Record<string, string> = { open: 'text-amber-700', in_progress: 'text-sky-700', resolved: 'text-emerald-700' };

/** One ticket: what the venue wrote, and the reply and status the super admin sets (the venue sees both). */
export function TicketItem({ t, onSaved }: { t: Ticket; onSaved: () => void }) {
  const [open, setOpen] = useState(t.status !== 'resolved' && t.priority === 'urgent');
  const [note, setNote] = useState(t.admin_note || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async (status?: string) => {
    setBusy(true); setErr(null);
    const r = await adminSend('/api/admin/support', 'PATCH', { id: t.id, admin_note: note, ...(status ? { status } : {}) });
    setBusy(false);
    if (r.ok) onSaved(); else setErr(r.message);
  };

  return (
    <li className="rounded-xl border border-[#ebebe8]">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left cursor-pointer">
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-semibold text-neutral-900">{t.subject}</span>
          <span className="block text-[11px] text-neutral-500">{t.venue} · {t.category} · {ago(t.created_at)}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold capitalize ${PRIORITY[t.priority]}`}>{t.priority}</span>
          <span className={`text-[11px] font-semibold capitalize ${STATUS[t.status]}`}>{t.status.replace('_', ' ')}</span>
        </span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-[#f0f0ed] px-4 py-3">
          <p className="whitespace-pre-wrap text-[13px] text-neutral-800">{t.body}</p>
          {t.phone && <p className="text-[12px] text-neutral-500">Venue phone: <a href={`tel:${t.phone}`} className="font-semibold text-[#2a78d6]">{t.phone}</a></p>}
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} placeholder="Reply to the venue (shown in their My profile)"
            className="w-full rounded-lg border border-[#e3e3df] px-3 py-2 text-[13px] outline-none focus:border-neutral-900" aria-label="Reply" />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => void save()} className="h-9 rounded-lg border border-[#e3e3df] px-3 text-[12.5px] font-semibold hover:bg-neutral-50 disabled:opacity-40 cursor-pointer">Save reply</button>
            {t.status !== 'in_progress' && t.status !== 'resolved' && <button type="button" disabled={busy} onClick={() => void save('in_progress')} className="h-9 rounded-lg border border-[#e3e3df] px-3 text-[12.5px] font-semibold hover:bg-neutral-50 disabled:opacity-40 cursor-pointer">Working on it</button>}
            {t.status !== 'resolved'
              ? <button type="button" disabled={busy} onClick={() => void save('resolved')} className="h-9 rounded-lg bg-[#0b0b0b] px-3 text-[12.5px] font-semibold text-white hover:bg-neutral-800 disabled:opacity-40 cursor-pointer">Resolve</button>
              : <button type="button" disabled={busy} onClick={() => void save('open')} className="h-9 rounded-lg border border-[#e3e3df] px-3 text-[12.5px] font-semibold hover:bg-neutral-50 disabled:opacity-40 cursor-pointer">Reopen</button>}
          </div>
          {err && <p role="alert" className="text-[12px] text-rose-700">{err}</p>}
        </div>
      )}
    </li>
  );
}
