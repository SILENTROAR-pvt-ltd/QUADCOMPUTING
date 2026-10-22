'use client';

import React, { useState } from 'react';
import { EVENT_CATEGORIES } from '@/lib/services/live-events/event-input';
import { GuestPoolField, poolPayload, type PoolValue } from './GuestPoolField';
import { OfferPhotoPicker } from '@/components/host/workspaces/catalog/components/offers/OfferPhotoPicker';
import { useOfferPhoto } from '@/components/host/workspaces/catalog/hooks/useOfferPhoto';

const FIELD = 'h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-[16px] focus:border-neutral-900 focus:outline-none sm:text-sm';
const LABEL = 'block text-[11px] font-semibold text-neutral-500';
/** The select's last choice: the host types their own category. */
const CUSTOM = '__custom__';

/** The datetime-local value for "tonight at 8 pm", the default start. */
const tonight = () => { const d = new Date(); d.setHours(20, 0, 0, 0); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

/** Publishes a live event: what it is, when, what it costs, what the guest gets, and who may come. */
export function EventForm({ onPublish, onCancel }: { onPublish: (body: Record<string, unknown>) => Promise<string | null>; onCancel: () => void }) {
  const [f, setF] = useState({ title: '', category: 'Live Music', customCategory: '', starts: tonight(), ends: '', fee: '0', description: '', perks: '' });
  const [pool, setPool] = useState<PoolValue>({ total: '', split: false, men: '' });
  const banner = useOfferPhoto();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const custom = f.category === CUSTOM;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const category = custom ? f.customCategory.trim() : f.category;
    if (!category) { setError('Type your own category, or pick one from the list.'); return; }
    if (banner.busy) { setError('The banner is still saving. Publish in a moment.'); return; }
    setBusy(true);
    setError(null);
    const problem = await onPublish({
      title: f.title, category, starts_at: new Date(f.starts).toISOString(), ends_at: f.ends ? new Date(f.ends).toISOString() : null,
      entry_fee: Number(f.fee) || 0, banner_url: banner.imageUrl || '', description: f.description, perks: f.perks,
      ...poolPayload(pool),
    });
    setBusy(false);
    if (problem) setError(problem); else onCancel();
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
      <label className={LABEL}>Event title *<input value={f.title} onChange={set('title')} placeholder="e.g. Sunset Acoustics & Cocktails" className={`${FIELD} mt-1`} required /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className={LABEL}>Category
            <select value={f.category} onChange={set('category')} className={`${FIELD} mt-1 cursor-pointer`}>
              {EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value={CUSTOM}>Your own category…</option>
            </select>
          </label>
          {custom && (
            <input value={f.customCategory} onChange={set('customCategory')} maxLength={40} autoFocus aria-label="Your own category"
              placeholder="e.g. Sufi Night, Wine Tasting, Ladies Night" className={FIELD} />
          )}
        </div>
        <label className={LABEL}>Entry fee (₹, 0 = free)<input value={f.fee} onChange={set('fee')} inputMode="decimal" className={`${FIELD} mt-1`} /></label>
        <label className={LABEL}>Starts *<input type="datetime-local" value={f.starts} onChange={set('starts')} className={`${FIELD} mt-1`} required /></label>
        <label className={LABEL}>Ends (optional)<input type="datetime-local" value={f.ends} onChange={set('ends')} className={`${FIELD} mt-1`} /></label>
      </div>
      <OfferPhotoPicker photo={banner} label="Banner" noneNote="No banner: guests see the event's title and details." />
      <label className={LABEL}>Perks (comma separated)<input value={f.perks} onChange={set('perks')} placeholder="Free welcome drink, Reserved seating" className={`${FIELD} mt-1`} /></label>
      <label className={LABEL}>About the event<textarea value={f.description} onChange={set('description')} rows={2} maxLength={1000} className={`${FIELD} mt-1 h-auto py-2`} /></label>
      <GuestPoolField value={pool} onChange={setPool} />
      {error && <p role="alert" className="text-xs font-medium text-rose-600">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <button type="button" onClick={onCancel} className="h-11 cursor-pointer rounded-xl px-4 text-sm font-semibold text-neutral-600 hover:bg-neutral-100">Cancel</button>
        <button type="submit" disabled={busy || banner.busy || f.title.trim().length < 2} className="h-11 cursor-pointer rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white disabled:opacity-40">{busy ? 'Publishing…' : 'Publish event'}</button>
      </div>
    </form>
  );
}
