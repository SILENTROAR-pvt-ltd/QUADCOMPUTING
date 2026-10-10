'use client';

import type { InventorySummary } from '@/lib/services/inventory/inventory.types';
import { inr } from './inventory-format';

function Tile({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: 'warn' | 'bad' }) {
  const hintTone = tone === 'bad' ? 'text-rose-700' : tone === 'warn' ? 'text-amber-700' : 'text-neutral-500';
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">{label}</p>
      <p className="mt-1.5 font-serif text-2xl tabular-nums text-neutral-950">{value}</p>
      <p className={`mt-0.5 truncate text-[11px] ${hintTone}`}>{hint}</p>
    </div>
  );
}

/** Stock value, what sales used, what was wasted, what needs attention, and recipe coverage. */
export function InventoryKpis({ s, isLoading }: { s?: InventorySummary; isLoading: boolean }) {
  if (isLoading || !s) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-busy="true">
        {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-[98px] animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100/70" />)}
      </div>
    );
  }
  const cov = s.recipe_coverage;
  const covPct = cov.total ? Math.round((cov.linked / cov.total) * 100) : 0;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Tile label="Stock value" value={inr(s.stock_value)} hint={`${s.item_count} item${s.item_count === 1 ? '' : 's'} at average cost`} />
      <Tile label="Used today" value={inr(s.used_today_value)} hint={`${inr(s.used_7d_value)} in 7 days, from sales`} />
      <Tile label="Wastage · 7 days" value={inr(s.wastage_7d_value)} hint={s.count_loss_30d_value ? `${inr(s.count_loss_30d_value)} short in counts (30 d)` : 'No count shortages'}
        tone={s.wastage_7d_value > 0 || s.count_loss_30d_value > 0 ? 'warn' : undefined} />
      <Tile label="Needs attention" value={String(s.attention_count)}
        hint={s.negative_count ? `${s.negative_count} below zero: record purchases` : s.attention_count ? 'Low or out of stock' : 'Everything above reorder level'}
        tone={s.negative_count ? 'bad' : s.attention_count ? 'warn' : undefined} />
      <Tile label="Recipe coverage" value={cov.total ? `${covPct}%` : '—'}
        hint={cov.total ? `${cov.linked} of ${cov.total} dishes deduct stock` : 'No dishes on the menu yet'} tone={cov.total && covPct < 100 ? 'warn' : undefined} />
      <Tile label="Purchases · 30 days" value={inr(s.purchases_30d_value)} hint={`${s.supplier_count} supplier${s.supplier_count === 1 ? '' : 's'}`} />
    </div>
  );
}
