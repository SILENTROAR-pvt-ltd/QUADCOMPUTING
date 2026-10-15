'use client';

import React, { useEffect, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';
import { EMPTY_MENU_INFO, type MenuInfo } from '@/lib/services/menu-info/menu-info';

const field = 'w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10';
const label = 'mb-1 block text-[11px] font-semibold uppercase tracking-widest text-zinc-500';

// The form works in text: one entry per line for lists.
const toText = (v: string[]) => v.join('\n');
const toList = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

type Draft = { tagline: string; address: string; delivery: string; phones: string; timings: string; notes: string };
// Same key order as MenuInfo, so the change check compares like with like.
type Core = Omit<MenuInfo, 'featured'>;
const fromDraft = (d: Draft): Core => ({
  tagline: d.tagline.trim(), address: d.address.trim(), delivery: d.delivery.trim(),
  phones: toList(d.phones), timings: toList(d.timings), notes: toList(d.notes),
});
// The top picks are saved by their own card; this form never sends or compares them.
const core = (i: MenuInfo): Core => ({ tagline: i.tagline, address: i.address, delivery: i.delivery, phones: i.phones, timings: i.timings, notes: i.notes });

/** What guests read on the menu: tagline, address, delivery, phones, timings and house notes. */
export function MenuInfoCard() {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<MenuInfo>(EMPTY_MENU_INFO);
  const [draft, setDraft] = useState<Draft>({ tagline: '', address: '', delivery: '', phones: '', timings: '', notes: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    apiRequest<any>('/api/host/menu-info', { cache: 'no-store' }).then((res) => {
      if (res.ok && res.data?.info) {
        const info: MenuInfo = res.data.info;
        setSaved(info);
        setDraft({ tagline: info.tagline, address: info.address, delivery: info.delivery, phones: toText(info.phones), timings: toText(info.timings), notes: toText(info.notes) });
      } else if (!res.ok) {
        setMessage({ kind: 'err', text: res.error || 'Could not load menu information.' });
      }
      setLoading(false);
    });
  }, []);

  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDraft((d) => ({ ...d, [key]: e.target.value }));
    setMessage(null);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const res = await apiRequest<any>('/api/host/menu-info', jsonRequest('PUT', { info: fromDraft(draft) }));
    setSaving(false);
    if (!res.ok) return setMessage({ kind: 'err', text: res.error || 'Could not save. Please try again.' });
    setSaved(res.data.info);
    setMessage({ kind: 'ok', text: 'Saved. Guests see this on the menu now.' });
  };

  const current = fromDraft(draft);
  const dirty = JSON.stringify(current) !== JSON.stringify(core(saved));

  return (
    <section className="mb-5 rounded-2xl border border-zinc-200 bg-white shadow-xs">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left cursor-pointer">
        <div>
          <p className="font-serif text-base text-zinc-950">Menu information</p>
          <p className="text-xs text-zinc-500">Tagline, address, delivery, phones, kitchen timings and the notes guests read on the menu.</p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-zinc-100 p-5">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label><span className={label}>Tagline</span><input className={field} value={draft.tagline} onChange={set('tagline')} maxLength={120} placeholder="We believe to serve you taste & quality" /></label>
                <label><span className={label}>Delivery</span><input className={field} value={draft.delivery} onChange={set('delivery')} maxLength={160} placeholder="Free delivery within 2 kms" /></label>
              </div>
              <label className="block"><span className={label}>Address</span><textarea className={field} rows={2} value={draft.address} onChange={set('address')} maxLength={240} /></label>
              <div className="grid gap-4 sm:grid-cols-3">
                <label><span className={label}>Phone numbers (one per line)</span><textarea className={field} rows={3} value={draft.phones} onChange={set('phones')} /></label>
                <label><span className={label}>Kitchen timings (one per line)</span><textarea className={field} rows={3} value={draft.timings} onChange={set('timings')} placeholder={'12:00 pm - 3:00 pm\n7:00 pm - 8:30 pm'} /></label>
                <label><span className={label}>House notes (one per line)</span><textarea className={field} rows={3} value={draft.notes} onChange={set('notes')} placeholder="Allow us 25-30 minutes to serve you" /></label>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p role={message?.kind === 'err' ? 'alert' : 'status'} className={`text-xs ${message?.kind === 'err' ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {message?.text ?? (dirty ? 'Unsaved changes' : '')}
                </p>
                <button type="button" onClick={save} disabled={saving || !dirty}
                  className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 cursor-pointer">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save menu information
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

export default MenuInfoCard;
