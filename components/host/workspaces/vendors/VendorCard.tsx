'use client';

import React, { useState } from 'react';
import { MessageCircle, Pencil, Send, Trash2 } from 'lucide-react';
import { VENDOR_CATEGORIES, whatsappLink } from '@/lib/services/vendors/vendor-input';
import type { Vendor } from './useVendors';

interface Props { vendor: Vendor; onEdit: () => void; onShare: () => void; onRemove: () => Promise<void> }

const prettyPhone = (p: string) => (p.startsWith('91') && p.length === 12 ? `+91 ${p.slice(2, 7)} ${p.slice(7)}` : `+${p}`);

/** One vendor: their QR (tap to enlarge), contact, and one-tap WhatsApp to chat or share a guest order. */
export function VendorCard({ vendor: v, onEdit, onShare, onRemove }: Props) {
  const [qrOpen, setQrOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const category = VENDOR_CATEGORIES.find((c) => c.id === v.category)?.label ?? 'Other';

  return (
    <article className="flex flex-col rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-xs">
      <div className="flex gap-3">
        <button type="button" onClick={() => v.qr_image && setQrOpen(true)} disabled={!v.qr_image} aria-label={v.qr_image ? `Show ${v.name}'s QR` : 'No QR'}
          className="grid h-20 w-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 disabled:cursor-default">
          {/* eslint-disable-next-line @next/next/no-img-element -- a stored data-URL QR; next/image cannot optimise it */}
          {v.qr_image ? <img src={v.qr_image} alt="" className="h-full w-full object-contain" /> : <span className="text-[10px] text-neutral-400">No QR</span>}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-950">{v.name}</p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">{category}</p>
          <a href={`tel:+${v.whatsapp_phone}`} className="mt-1 block text-xs font-medium text-neutral-800 underline-offset-2 hover:underline">{prettyPhone(v.whatsapp_phone)}</a>
          {v.notes && <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{v.notes}</p>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={onShare} className="inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-neutral-950 text-xs font-semibold text-white hover:bg-neutral-800">
          <Send className="h-3.5 w-3.5" aria-hidden /> Share order
        </button>
        <a href={whatsappLink(v.whatsapp_phone, 'Hello!')} target="_blank" rel="noopener noreferrer"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-900 hover:bg-neutral-50">
          <MessageCircle className="h-3.5 w-3.5" aria-hidden /> WhatsApp
        </a>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-xs">
        {confirming ? (
          <>
            <span className="mr-auto text-neutral-600">Remove {v.name}?</span>
            <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await onRemove(); } finally { setBusy(false); setConfirming(false); } }}
              className="h-8 cursor-pointer rounded-lg bg-rose-600 px-3 font-semibold text-white disabled:opacity-50">{busy ? 'Removingâ€¦' : 'Remove'}</button>
            <button type="button" onClick={() => setConfirming(false)} className="h-8 cursor-pointer rounded-lg px-3 font-semibold text-neutral-600 hover:bg-neutral-100">Cancel</button>
          </>
        ) : (
          <>
            <button type="button" onClick={onEdit} className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg px-2.5 font-semibold text-neutral-600 hover:bg-neutral-100"><Pencil className="h-3.5 w-3.5" aria-hidden /> Edit</button>
            <button type="button" onClick={() => setConfirming(true)} className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg px-2.5 font-semibold text-rose-700 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove</button>
          </>
        )}
      </div>

      {qrOpen && v.qr_image && (
        <div role="dialog" aria-modal="true" aria-label={`${v.name} QR`} onClick={() => setQrOpen(false)} className="fixed inset-0 z-[130] grid place-items-center bg-black/70 p-6">
          <div className="rounded-3xl bg-white p-5 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- a stored data-URL QR; next/image cannot optimise it */}
            <img src={v.qr_image} alt={`${v.name} QR`} className="mx-auto max-h-[70dvh] w-full max-w-sm object-contain" />
            <p className="mt-3 text-sm font-semibold text-neutral-900">{v.name}</p>
            <p className="text-xs text-neutral-500">Tap anywhere to close</p>
          </div>
        </div>
      )}
    </article>
  );
}
