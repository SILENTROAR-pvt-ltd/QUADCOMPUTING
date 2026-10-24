'use client';

import React, { useState } from 'react';
import { Megaphone } from 'lucide-react';
import { Panel, Empty } from '../ui/Panel';
import { ago, dateShort } from '../ui/format';
import { adminSend, useAdminData } from '../ui/useAdminData';

interface Notice { id: string; title: string; body: string | null; severity: 'info' | 'warning' | 'critical'; starts_at: string; ends_at: string | null; withdrawn_at: string | null }
const LOOK = { info: 'border-sky-200 bg-sky-50 text-sky-800', warning: 'border-amber-200 bg-amber-50 text-amber-900', critical: 'border-rose-200 bg-rose-50 text-rose-800' };
const input = 'w-full rounded-lg border border-[#e3e3df] bg-white px-3 py-2 text-[13px] outline-none focus:border-neutral-900';

/** Push a notice to every venue's control center (maintenance, updates, urgent problems) and withdraw it. */
export function Broadcast() {
  const list = useAdminData<{ ready: boolean; announcements: Notice[] }>('/api/admin/announcements', 60_000);
  const [title, setTitle] = useState(''); const [body, setBody] = useState('');
  const [severity, setSeverity] = useState<Notice['severity']>('info'); const [hours, setHours] = useState('24');
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const now = Date.now();
  const live = (n: Notice) => !n.withdrawn_at && (!n.ends_at || Date.parse(n.ends_at) > now);

  const publish = async () => {
    if (!window.confirm(`Show "${title}" on every venue's screen now?`)) return;
    setBusy(true);
    const r = await adminSend('/api/admin/announcements', 'POST', { title, body, severity, hours: hours === '' ? null : Number(hours) });
    setBusy(false); setMsg({ ok: r.ok, text: r.ok ? 'Published to every venue.' : r.message });
    if (r.ok) { setTitle(''); setBody(''); void list.refresh(); }
  };
  const withdraw = async (id: string) => { const r = await adminSend('/api/admin/announcements', 'PATCH', { id }); setMsg({ ok: r.ok, text: r.ok ? 'Withdrawn.' : r.message }); void list.refresh(); };

  return (
    <Panel title="Broadcast to venues" note="Shows at the top of every venue's control center within a minute">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Title, e.g. Scheduled maintenance tonight 2–3 AM" className={input} aria-label="Title" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={600} rows={3} placeholder="Details (optional)" className={input} aria-label="Message" />
          <div className="flex flex-wrap gap-2">
            <select value={severity} onChange={(e) => setSeverity(e.target.value as Notice['severity'])} className={`${input} w-auto`} aria-label="Severity">
              <option value="info">Info</option><option value="warning">Warning</option><option value="critical">Critical</option>
            </select>
            <select value={hours} onChange={(e) => setHours(e.target.value)} className={`${input} w-auto`} aria-label="Show for">
              <option value="6">6 hours</option><option value="24">24 hours</option><option value="72">3 days</option><option value="168">7 days</option><option value="">Until withdrawn</option>
            </select>
            <button type="button" onClick={() => void publish()} disabled={busy || title.trim().length < 3}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0b0b0b] px-4 text-[12.5px] font-semibold text-white hover:bg-neutral-800 disabled:opacity-40 cursor-pointer">
              <Megaphone className="h-3.5 w-3.5" aria-hidden /> Publish
            </button>
          </div>
          {msg && <p role={msg.ok ? 'status' : 'alert'} className={`text-[12.5px] ${msg.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{msg.text}</p>}
        </div>
        <div>
          {list.data && !list.data.ready ? <Empty>Broadcasts start once supabase/apply-pending-2026-10-24c.sql is applied.</Empty>
            : (list.data?.announcements || []).length === 0 ? <Empty>No notices yet.</Empty>
            : <ul className="space-y-2">{list.data!.announcements.slice(0, 6).map((n) => (
                <li key={n.id} className={`rounded-xl border px-3 py-2 ${live(n) ? LOOK[n.severity] : 'border-neutral-200 bg-neutral-50 text-neutral-500'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-semibold">{n.title}</p>
                    {live(n) && <button type="button" onClick={() => void withdraw(n.id)} className="shrink-0 text-[11px] font-semibold underline cursor-pointer">Withdraw</button>}
                  </div>
                  <p className="text-[11px] opacity-80">{live(n) ? `Live · since ${ago(n.starts_at)}${n.ends_at ? ` · ends ${dateShort(n.ends_at)}` : ''}` : n.withdrawn_at ? `Withdrawn ${ago(n.withdrawn_at)}` : 'Ended'}</p>
                </li>
              ))}</ul>}
        </div>
      </div>
    </Panel>
  );
}
