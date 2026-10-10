'use client';

import { useEffect, useRef, useState } from 'react';
import { ClipboardCheck, PackagePlus, Plus, RotateCw, X } from 'lucide-react';
import { InventoryAuditModal } from '@/components/host/modals/InventoryAuditModal';
import { NewRawStockModal } from '@/components/host/modals/NewRawStockModal';
import type { StockItemView } from '@/lib/services/inventory/inventory.types';
import { RawInventoryItem } from './inventory/inventory.types';
import { useInventory } from './inventory/useInventory';
import { InventoryKpis } from './inventory/InventoryKpis';
import { StockTable } from './inventory/StockTable';
import { PurchasingView } from './inventory/purchasing/PurchasingView';
import { MovementsLedger } from './inventory/MovementsLedger';
import { StockItemDrawer } from './inventory/StockItemDrawer';
import { PurchaseSheet } from './inventory/PurchaseSheet';
import { InventoryEmptyState } from './inventory/InventoryEmptyState';

export type { RawInventoryItem };
type Tab = 'stock' | 'reorder' | 'history';
const btn = 'inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold cursor-pointer';

/** Raw stock: what is on hand, what sales used, what to reorder, and every movement. */
export function InventoryWorkspace() {
  const inv = useInventory();
  const items = inv.data?.items || [];
  const [tab, setTab] = useState<Tab>('stock');
  const [openId, setOpenId] = useState<string | null>(null);
  const [modal, setModal] = useState<'add' | 'count' | 'purchase' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const open = items.find((i) => i.id === openId) || null;
  const reorderCount = items.filter((i) => i.suggested_order > 0).length;

  const notify = (msg: string) => {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 4500);
    void inv.reload();
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const openItem = (i: StockItemView) => setOpenId(i.id);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-neutral-950">Raw inventory</h1>
          <p className="mt-1 text-sm text-neutral-500">Stock falls automatically as recipe dishes sell. Record deliveries, wastage and counts here.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void inv.reload()} aria-label="Refresh" className={`${btn} w-10 border border-neutral-200 bg-white px-0 text-neutral-600 hover:bg-neutral-50`}>
            <RotateCw className={`h-4 w-4 ${inv.isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button type="button" onClick={() => setModal('count')} disabled={!items.length} className={`${btn} border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 disabled:opacity-40`}><ClipboardCheck className="h-4 w-4" /> Stock count</button>
          <button type="button" onClick={() => setModal('purchase')} disabled={!items.length} className={`${btn} border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 disabled:opacity-40`}><PackagePlus className="h-4 w-4" /> Record purchase</button>
          <button type="button" onClick={() => setModal('add')} className={`${btn} bg-neutral-950 text-white hover:bg-neutral-800`}><Plus className="h-4 w-4" /> Add items</button>
        </div>
      </header>

      {inv.error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          <span>{inv.error}</span><button type="button" onClick={() => void inv.reload()} className="font-semibold underline cursor-pointer">Try again</button>
        </div>
      )}

      <InventoryKpis s={inv.data?.summary} isLoading={inv.isLoading} />

      {!inv.isLoading && items.length === 0 ? <InventoryEmptyState onAdd={() => setModal('add')} /> : (
        <>
          <div role="tablist" aria-label="Inventory views" className="inline-flex gap-1 rounded-xl bg-neutral-100 p-1">
            {([['stock', 'Stock'], ['reorder', `Purchasing${reorderCount ? ` (${reorderCount} low)` : ''}`], ['history', 'Stock history']] as const).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={`h-9 rounded-lg px-4 text-sm font-semibold cursor-pointer ${tab === id ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'}`}>{label}</button>
            ))}
          </div>
          {inv.isLoading ? <div className="h-80 animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100/70" />
            : tab === 'stock' ? <StockTable items={items} onOpen={openItem} />
            : tab === 'reorder' ? <PurchasingView items={items} version={inv.version} onChanged={notify} />
            : <MovementsLedger version={inv.version} />}
        </>
      )}

      <StockItemDrawer item={open} items={items} version={inv.version} onClose={() => setOpenId(null)} onChanged={notify} />
      {modal === 'purchase' && <PurchaseSheet items={items} onClose={() => setModal(null)} onDone={notify} />}
      {modal === 'count' && <InventoryAuditModal items={items} onClose={() => setModal(null)} onSuccess={(m) => { setModal(null); notify(m); }} />}
      {modal === 'add' && <NewRawStockModal onClose={() => setModal(null)} onSuccess={(msg) => notify(msg || 'Stock items added.')} />}

      {toast && (
        <div role="status" className="fixed bottom-6 right-6 z-[120] flex max-w-sm items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-xs font-medium text-neutral-900 shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" /><span>{toast}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss" className="text-neutral-400 hover:text-neutral-900 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
    </div>
  );
}
