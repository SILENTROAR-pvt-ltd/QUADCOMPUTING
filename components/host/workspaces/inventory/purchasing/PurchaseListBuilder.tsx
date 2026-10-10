'use client';

import { useState } from 'react';
import { Check, Copy, MessageCircle } from 'lucide-react';
import type { StockItemView } from '@/lib/services/inventory/inventory.types';
import { buildPurchaseMessage, displayPhone, poReference } from '@/lib/services/inventory/purchase-message';
import { inr } from '../inventory-format';
import { VendorPicker } from './VendorPicker';
import { PurchaseDraftTable } from './PurchaseDraftTable';
import { usePurchaseDraft } from './usePurchaseDraft';
import type { usePurchasing } from './usePurchasing';

interface Props { items: StockItemView[]; p: ReturnType<typeof usePurchasing>; onSent: (msg: string) => void }

/** Build the purchase list for one vendor and send it to their WhatsApp. */
export function PurchaseListBuilder({ items, p, onSent }: Props) {
  const [vendorId, setVendorId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vendor = p.vendors.find((v) => v.id === vendorId) || null;
  const d = usePurchaseDraft(items, p.onOrder, vendor);
  const message = vendor && d.lines.length
    ? buildPurchaseMessage({ venueName: p.venueName, vendorName: vendor.name, reference: poReference(), lines: d.lines, note }) : '';
  const blocked = !vendor ? 'Choose a vendor.' : !d.lines.length ? 'Tick at least one item with a quantity.' : d.missingQty ? 'Enter a quantity for every ticked item.' : null;

  const send = () => {
    if (!vendor || blocked) { setError(blocked); return; }
    setBusy(true); setError(null);
    const count = d.lines.length;
    p.sendOrder(vendor, d.lines, note)
      .then(() => { d.reset(); setNote(''); onSent(`Order sent to ${vendor.name} (${count} item${count === 1 ? '' : 's'}). Receive it here when it arrives.`); })
      .catch((e) => setError(`WhatsApp opened, but the order was not saved: ${e.message}`))
      .finally(() => setBusy(false));
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setError('Copy is blocked in this browser.'); }
  };

  return (
    <section aria-label="Purchase list" className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
      <div>
        <h3 className="font-serif text-xl text-neutral-950">Purchase list</h3>
        <p className="text-xs text-neutral-500">Low items are filled in with about two weeks of use, less anything already on order.</p>
      </div>
      <VendorPicker vendors={p.vendors} value={vendorId} onChange={setVendorId} onSave={p.saveVendor} />
      {vendor && !vendor.phone && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">No WhatsApp number for {vendor.name}: WhatsApp will open and ask you to pick the chat. Add the number to send straight to them.</p>
      )}
      <PurchaseDraftTable rows={d.rows} items={items} onUpdate={d.update} onAdd={d.addItem} />
      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold text-neutral-600">Note for the vendor</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={240} placeholder="e.g. Deliver before 10 am tomorrow"
          className="h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-900" />
      </label>
      {message && (
        <details className="rounded-xl bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
          <summary className="cursor-pointer font-semibold">Message preview</summary>
          <pre className="mt-2 whitespace-pre-wrap font-sans">{message}</pre>
        </details>
      )}
      {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p>}
      <div className="flex flex-col gap-2 border-t border-neutral-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-neutral-700">{d.lines.length} item{d.lines.length === 1 ? '' : 's'} · about <strong className="text-neutral-950">{inr(d.total)}</strong></p>
        <div className="flex gap-2">
          <button type="button" onClick={copy} disabled={!message} className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-neutral-200 px-4 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-40 cursor-pointer">
            {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
          </button>
          <button type="button" onClick={send} disabled={busy || Boolean(blocked)} title={blocked || undefined}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#128C7E] px-5 text-sm font-semibold text-white hover:bg-[#0f7a6e] disabled:opacity-40 cursor-pointer">
            <MessageCircle className="h-4 w-4" /> {busy ? 'Saving…' : vendor?.phone ? `Send to ${displayPhone(vendor.phone)}` : 'Send on WhatsApp'}
          </button>
        </div>
      </div>
    </section>
  );
}
