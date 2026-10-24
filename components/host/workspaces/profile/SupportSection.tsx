'use client';

import React, { useEffect, useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';

interface Ticket { id: string; subject: string; category: string; priority: string; status: string; admin_note: string | null; created_at: string }
const field = 'w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900';
const STATUS: Record<string, string> = { open: 'Waiting for the platform', in_progress: 'Being worked on', resolved: 'Resolved' };

/** Help & support: the owner asks the Vibers team for help, and sees each request's status and reply here. */
export function SupportSection() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState(''); const [body, setBody] = useState('');
  const [category, setCategory] = useState('technical'); const [priority, setPriority] = useState('normal');
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () => apiRequest<{ tickets: Ticket[] }>('/api/host/support', { cache: 'no-store' }).then((r) => { if (r.ok && r.data) setTickets(r.data.tickets); });
  useEffect(() => { void load(); }, []);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const r = await apiRequest('/api/host/support', jsonRequest('POST', { subject, body, category, priority }));
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: 'Sent. The Vibers team will reply here.' } : { ok: false, text: r.error || 'Could not send.' });
    if (r.ok) { setSubject(''); setBody(''); void load(); }
  };

  return (
    <section id="support" aria-label="Help and support" className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-950 text-white"><LifeBuoy className="h-5 w-5" aria-hidden /></span>
        <div><h2 className="font-serif text-lg text-neutral-950">Help & support</h2><p className="mt-0.5 text-xs text-neutral-500">Something not working, a billing question, or a request? Tell the Vibers team.</p></div>
      </div>
      <form onSubmit={send} className="mt-4 space-y-3">
        <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={140} placeholder="Subject" className={field} aria-label="Subject" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} rows={4} placeholder="What happened, and what you expected" className={field} aria-label="Message" />
        <div className="flex flex-wrap items-center gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${field} w-auto`} aria-label="Type">
            <option value="technical">Technical</option><option value="billing">Billing & plans</option><option value="account">Account</option><option value="other">Other</option>
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className={`${field} w-auto`} aria-label="Urgency">
            <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent: service is stopped</option>
          </select>
          <button type="submit" disabled={busy || subject.trim().length < 3 || body.trim().length < 3} className="h-10 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40 cursor-pointer">{busy ? 'Sending…' : 'Send'}</button>
        </div>
        {msg && <p role={msg.ok ? 'status' : 'alert'} className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{msg.text}</p>}
      </form>
      {tickets.length > 0 && (
        <ul className="mt-5 divide-y divide-neutral-100 rounded-2xl border border-neutral-100">
          {tickets.map((t) => (
            <li key={t.id} className="px-4 py-3 text-sm">
              <div className="flex justify-between gap-3"><span className="font-semibold text-neutral-900">{t.subject}</span><span className={`shrink-0 text-xs font-semibold ${t.status === 'resolved' ? 'text-emerald-700' : 'text-amber-700'}`}>{STATUS[t.status] || t.status}</span></div>
              {t.admin_note && <p className="mt-1 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-700"><b>Vibers team:</b> {t.admin_note}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
