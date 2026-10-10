'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Receipt } from 'lucide-react';
import type { OutstandingBill } from '@/types/wallet';
import { apiRequest } from '@/lib/utils/api-client';
import { usePoll } from '@/lib/utils/use-poll';

interface Props { venueId: string; onSettled?: () => void; }
const TL: Record<string, string> = {
  bill_generate: 'Bill fee',
  menu_addon: 'Menu',
  menu_addon_creation: 'Menu',
  menu_item_creation: 'Menu item',
  room_accommodation: 'Room',
  room_creation: 'Room',
  other: 'Other',
};

/** Fees that arrived while the credit wallet was empty. Billing never stops; they wait here as dues. */
export function OutstandingBillingSection({ venueId }: Props) {
  const [bills, setBills] = useState<OutstandingBill[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const res = await apiRequest<any>(`/api/host/wallet/outstanding?venue_id=${venueId}`, { cache: 'no-store' });
    if (res.ok && res.data?.success) setBills(res.data.bills ?? []);
    setLoaded(true);
  }, [venueId]);

  useEffect(() => {
    load();
    const onRefresh = () => load();
    window.addEventListener('wallet:refresh', onRefresh);
    return () => window.removeEventListener('wallet:refresh', onRefresh);
  }, [load]);
  usePoll(() => { void load(); }, 20_000);

  const unpaid = bills.filter((b) => b.status === 'unpaid');
  const total = unpaid.reduce((s, b) => s + Number(b.amount), 0);

  return (
    <section className="rounded-2xl border border-neutral-200/90 bg-white shadow-xs p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-neutral-100">
        <div className="flex items-center gap-2.5">
          <Receipt className="w-4 h-4 text-neutral-500" />
          <h3 className="font-serif text-lg sm:text-xl font-medium tracking-tight text-neutral-900">Outstanding dues</h3>
          {unpaid.length > 0 && (
            <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-800">{unpaid.length} unpaid</span>
          )}
        </div>
        {total > 0
          ? <span className="font-semibold tabular-nums text-neutral-900">₹{total.toFixed(2)} due</span>
          : loaded && <span className="text-emerald-700 text-sm font-medium">All clear</span>}
      </div>

      {!loaded ? (
        <div className="py-10 space-y-2"><div className="h-4 bg-neutral-100 rounded animate-pulse" /><div className="h-4 w-2/3 bg-neutral-100 rounded animate-pulse" /></div>
      ) : bills.length === 0 ? (
        <p className="py-10 text-center text-xs text-neutral-400">No dues. Fees are covered by your plan or your credit.</p>
      ) : (
        <div className="overflow-x-auto mt-1">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-100 text-[10px] uppercase tracking-wider text-neutral-500">
                <th className="py-2.5 px-3 font-medium">Description</th>
                <th className="py-2.5 px-3 font-medium">Type</th>
                <th className="py-2.5 px-3 font-medium text-right">Amount</th>
                <th className="py-2.5 px-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {bills.slice(0, 10).map((bill) => (
                <tr key={bill.id} className="hover:bg-neutral-50/70">
                  <td className="py-3 px-3 text-neutral-800 font-medium max-w-[220px] truncate">{bill.description}</td>
                  <td className="py-3 px-3 text-neutral-500">{TL[bill.item_type] ?? bill.item_type}</td>
                  <td className="py-3 px-3 text-right font-semibold tabular-nums text-neutral-900">₹{Number(bill.amount).toFixed(2)}</td>
                  <td className="py-3 px-3 text-right">
                    {bill.status === 'unpaid'
                      ? <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 text-[10px] font-medium"><AlertCircle className="w-2.5 h-2.5" /> Unpaid</span>
                      : <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 text-[10px] font-medium"><CheckCircle2 className="w-2.5 h-2.5" /> Paid</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {unpaid.length > 0 && (
        <p className="mt-4 pt-4 border-t border-neutral-100 text-xs text-neutral-500">
          Dues are cleared by the Quad Computing team. Contact support to settle ₹{total.toFixed(2)}; an annual plan stops new fees.
        </p>
      )}
    </section>
  );
}
