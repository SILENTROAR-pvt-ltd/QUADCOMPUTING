'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, MessageCircle, PackageCheck, X } from 'lucide-react';
import type { StockItemView } from '@/lib/services/inventory/inventory.types';
import { displayPhone } from '@/lib/services/inventory/purchase-message';
import { inr } from './inventory-format';
import { usePurchasing } from './purchasing/usePurchasing';
import { PurchaseCubes } from './purchasing/PurchaseCubes';
import { NewPurchaseItem } from './purchasing/NewPurchaseItem';
import { PurchaseReview } from './purchasing/PurchaseReview';
import { cartProblem, cartTotal, patchLine, toApiLines, toggleLine, type CartLine } from './purchasing/purchase-cart';

interface Props {
  items: StockItemView[];
  version: number;
  onClose: () => void;
  onDone: (msg: string) => void;
  /** Called after an order is sent, to take the host to the open orders where it is received. */
  onSent?: () => void;
}

type Step = 'pick' | 'new' | 'review';

/**
 * Record a purchase: tap the raw items you are buying (any number, plus items that are not in stock yet), set quantities,
 * then either send the order to the vendor on WhatsApp (it is received into stock when it arrives) or, when the goods
 * are already here, add them to stock now.
 */
export function PurchaseSheet({ items, version, onClose, onDone, onSent }: Props) {
  const p = usePurchasing(version);
  const [step, setStep] = useState<Step>('pick');
  const [lines, setLines] = useState<CartLine[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'send' | 'now' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const vendor = p.vendors.find((v) => v.id === vendorId) || null;
  const total = cartTotal(lines);
  const names = useMemo(() => items.map((i) => i.item_name), [items]);
  const categories = useMemo(() => Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort(), [items]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [onClose, busy]);

  const toggle = useCallback((item: StockItemView) => setLines((l) => toggleLine(l, item)), []);
  const removeLine = useCallback((id: string) => setLines((l) => l.filter((x) => x.id !== id)), []);
  const patch = useCallback((id: string, change: Partial<CartLine>) => setLines((l) => patchLine(l, id, change)), []);

  const send = () => {
    const problem = !vendor ? 'Choose a vendor to send this to.' : cartProblem(lines, { needCost: false, existingNames: names });
    if (problem || !vendor) { setError(problem); return; }
    setBusy('send'); setError(null);
    const count = lines.length;
    // WhatsApp opens inside this tap; the order is saved behind it.
    p.sendOrder(vendor, toApiLines(lines), note)
      .then(() => { onDone(`Order sent to ${vendor.name} (${count} item${count === 1 ? '' : 's'}). Receive it under Purchasing when it arrives and it is added to stock.`); onSent?.(); onClose(); })
      .catch((e) => { setError(`WhatsApp opened, but the order was not saved: ${e.message}`); setBusy(null); });
  };

  const receiveNow = () => {
    const problem = cartProblem(lines, { needCost: true, existingNames: names });
    if (problem) { setError(problem); return; }
    setBusy('now'); setError(null);
    p.recordNow(vendor, toApiLines(lines), note)
      .then((r) => { onDone(r.failed.length ? `Added ${r.received} item(s); not recorded: ${r.failed.join('; ')}` : `${r.received} item${r.received === 1 ? '' : 's'} added to raw inventory.`); onClose(); })
      .catch((e) => { setError(e.message); setBusy(null); });
  };

  const title = step === 'new' ? 'New item' : step === 'review' ? 'Review purchase' : 'Record purchase';

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-neutral-950/40 sm:items-center sm:p-4" onClick={() => { if (!busy) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Record purchase" onClick={(e) => e.stopPropagation()}
        className="flex h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[28px] bg-[#faf9f6] shadow-2xl animate-in slide-in-from-bottom-6 duration-200 sm:h-[88dvh] sm:rounded-3xl sm:slide-in-from-bottom-0">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200/80 bg-white px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            {step === 'review' && (
              <button type="button" onClick={() => { setStep('pick'); setError(null); }} aria-label="Back to items" className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-neutral-100 active:scale-95"><ArrowLeft className="h-4 w-4" /></button>
            )}
            <div className="min-w-0">
              <h2 className="truncate font-serif text-2xl leading-tight text-neutral-950">{title}</h2>
              {step !== 'new' && <p className="text-[11px] text-neutral-500">{step === 'pick' ? 'Step 1 of 2 · tap everything you are buying' : 'Step 2 of 2 · quantities, vendor, send'}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={Boolean(busy)} aria-label="Close" className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-neutral-100 text-neutral-600 active:scale-95 disabled:opacity-40"><X className="h-4 w-4" /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          {step === 'new' && (
            <NewPurchaseItem categories={categories} onBack={() => setStep('pick')} onAdd={(l) => { setLines((cur) => [...cur, l]); setStep('pick'); }} />
          )}
          {step === 'pick' && <PurchaseCubes items={items} lines={lines} onToggle={toggle} onRemoveNew={removeLine} onNew={() => setStep('new')} />}
          {step === 'review' && (
            <PurchaseReview lines={lines} vendors={p.vendors} vendorId={vendorId} note={note} onPatch={patch} onRemove={removeLine}
              onVendor={setVendorId} onNote={setNote} onSaveVendor={p.saveVendor} />
          )}
        </div>

        {step === 'pick' && (
          <footer className="shrink-0 border-t border-neutral-200/80 bg-white px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:px-5">
            <button type="button" disabled={lines.length === 0} onClick={() => { setStep('review'); setError(null); }}
              className="flex h-14 w-full cursor-pointer items-center justify-between rounded-2xl bg-neutral-950 px-5 text-white shadow-[0_14px_24px_-14px_rgba(0,0,0,0.6)] active:scale-[0.99] disabled:bg-neutral-300 disabled:shadow-none">
              <span className="text-[14px] font-semibold">{lines.length ? `Review ${lines.length} item${lines.length === 1 ? '' : 's'}` : 'Tap items to select'}</span>
              {lines.length > 0 && <span className="font-mono text-[15px]">{total > 0 ? `about ${inr(total)}` : 'Next'}</span>}
            </button>
          </footer>
        )}

        {step === 'review' && (
          <footer className="shrink-0 space-y-2.5 border-t border-neutral-200/80 bg-white px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:px-5">
            {vendor && !vendor.phone && <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">No WhatsApp number for {vendor.name}: WhatsApp will ask you to pick the chat. Add the number to send straight to them.</p>}
            {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">{error}</p>}
            <div className="flex items-baseline justify-between text-sm text-neutral-700">
              <span>{lines.length} item{lines.length === 1 ? '' : 's'}</span>
              <span>about <strong className="font-mono text-base text-neutral-950">{inr(total, 2)}</strong></span>
            </div>
            <button type="button" onClick={send} disabled={Boolean(busy)}
              className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#128C7E] text-[14px] font-semibold text-white shadow-[0_14px_24px_-14px_rgba(18,140,126,0.8)] active:scale-[0.99] disabled:opacity-50">
              {busy === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              {busy === 'send' ? 'Saving…' : vendor?.phone ? `Send to ${vendor.name} · ${displayPhone(vendor.phone)}` : 'Send to vendor on WhatsApp'}
            </button>
            <button type="button" onClick={receiveNow} disabled={Boolean(busy)}
              className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-neutral-300 bg-white text-[13px] font-semibold text-neutral-900 active:bg-neutral-50 disabled:opacity-50">
              {busy === 'now' ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
              {busy === 'now' ? 'Adding to stock…' : 'Already received? Add to stock now'}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
