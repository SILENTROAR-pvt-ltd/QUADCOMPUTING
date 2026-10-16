'use client';

import React, { useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { VENDOR_CATEGORIES } from '@/lib/services/vendors/vendor-input';
import { qrFileToDataUrl } from './qr-image';
import type { Vendor, VendorDraft } from './useVendors';

const field = 'h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none';
const label = 'mb-1 block text-xs font-semibold text-neutral-700';

interface Props { vendor?: Vendor | null; onClose: () => void; onSave: (draft: VendorDraft, id?: string) => Promise<void> }

/** Add or edit a vendor: name, category, WhatsApp number, their QR (photo or screenshot) and notes. */
export function VendorFormSheet({ vendor, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<VendorDraft>({
    name: vendor?.name ?? '', category: vendor?.category ?? 'food',
    whatsapp_phone: vendor?.whatsapp_phone ?? '', qr_image: vendor?.qr_image ?? null, notes: vendor?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<VendorDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const pickQr = async (file: File | undefined) => {
    if (!file) return;
    try { set({ qr_image: await qrFileToDataUrl(file) }); setError(null); } catch (e: any) { setError(e.message); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try { await onSave(draft, vendor?.id); onClose(); } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="vendor-form-title" className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <form onSubmit={submit} className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
        <header className="flex items-center justify-between gap-3">
          <h2 id="vendor-form-title" className="font-serif text-2xl text-neutral-950">{vendor ? 'Edit vendor' : 'Add vendor'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 cursor-pointer place-items-center rounded-full hover:bg-neutral-100"><X className="h-4 w-4" /></button>
        </header>

        <div className="mt-4 flex-1 space-y-4 overflow-y-auto pb-1">
          <div><label htmlFor="v-name" className={label}>Name</label>
            <input id="v-name" required maxLength={80} value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ravi Bike Rentals" className={field} /></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label htmlFor="v-cat" className={label}>Category</label>
              <select id="v-cat" value={draft.category} onChange={(e) => set({ category: e.target.value as VendorDraft['category'] })} className={field}>
                {VENDOR_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select></div>
            <div><label htmlFor="v-phone" className={label}>WhatsApp number</label>
              <input id="v-phone" required type="tel" inputMode="tel" value={draft.whatsapp_phone} onChange={(e) => set({ whatsapp_phone: e.target.value })} placeholder="98765 43210" className={field} /></div>
          </div>

          <div>
            <span className={label}>Their QR (menu or payment)</span>
            <div className="flex items-center gap-3">
              {draft.qr_image
                // eslint-disable-next-line @next/next/no-img-element -- a stored data-URL QR; next/image cannot optimise it
                ? <img src={draft.qr_image} alt="Vendor QR" className="h-24 w-24 rounded-xl border border-neutral-200 object-contain" />
                : <div className="grid h-24 w-24 place-items-center rounded-xl border border-dashed border-neutral-300 text-neutral-400"><ImagePlus className="h-6 w-6" /></div>}
              <div className="space-y-2">
                <label className="inline-flex h-9 cursor-pointer items-center rounded-xl border border-neutral-200 px-3 text-xs font-semibold text-neutral-800 hover:bg-neutral-50">
                  {draft.qr_image ? 'Replace image' : 'Upload image'}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => void pickQr(e.target.files?.[0])} />
                </label>
                {draft.qr_image && <button type="button" onClick={() => set({ qr_image: null })} className="block cursor-pointer text-xs font-semibold text-rose-700">Remove image</button>}
              </div>
            </div>
          </div>

          <div><label htmlFor="v-notes" className={label}>Notes (optional)</label>
            <textarea id="v-notes" rows={2} maxLength={300} value={draft.notes ?? ''} onChange={(e) => set({ notes: e.target.value })}
              placeholder="Open 8 AM â€“ 8 PM Â· â‚¹400 a day per scooter" className={`${field} h-auto resize-none py-2`} /></div>
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        </div>

        <button type="submit" disabled={saving} className="mt-4 h-12 cursor-pointer rounded-2xl bg-neutral-950 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50">
          {saving ? 'Savingâ€¦' : vendor ? 'Save changes' : 'Add vendor'}
        </button>
      </form>
    </div>
  );
}
