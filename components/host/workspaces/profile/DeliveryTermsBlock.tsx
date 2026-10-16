'use client';

import React from 'react';
import { input } from './ProfileFields';
import { useDeliveryTerms } from './useDeliveryTerms';

/** Delivery terms inside Hours & services: the switch, the radius, the minimum order, the fee and the venue's location. */
export function DeliveryTermsBlock() {
  const d = useDeliveryTerms();

  if (d.loadError) return <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{d.loadError}</p>;
  if (!d.form) return <div className="h-40 animate-pulse rounded-2xl bg-neutral-100" aria-busy="true" />;
  const f = d.form;
  const hasLocation = f.venueLat !== null && f.venueLng !== null;

  return (
    <div className="space-y-4 rounded-2xl border border-neutral-200 p-4">
      <label className="flex cursor-pointer items-start justify-between gap-4">
        <span>
          <span className="block text-sm font-semibold text-neutral-950">Deliver to guests</span>
          <span className="mt-0.5 block text-xs text-neutral-500">Guests order from the menu and pay on delivery or by UPI. Orders reach the kitchen like table orders.</span>
        </span>
        <input type="checkbox" role="switch" aria-checked={f.enabled} checked={f.enabled}
          onChange={(e) => d.update({ enabled: e.target.checked })} className="mt-1 h-5 w-5 shrink-0 accent-neutral-900" />
      </label>

      <div className="rounded-xl bg-neutral-50 p-3">
        <p className="text-xs font-semibold text-neutral-800">Venue location</p>
        <p className="mt-0.5 text-xs text-neutral-500">
          {hasLocation ? `Saved: ${f.venueLat}, ${f.venueLng}. Delivery range is measured from here.` : 'Not set. Delivery range is measured from this point, so set it while you are at the venue.'}
        </p>
        <button type="button" onClick={d.useDeviceLocation} disabled={d.locating}
          className="mt-2 h-9 cursor-pointer rounded-xl border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 disabled:opacity-40">
          {d.locating ? 'Finding location…' : hasLocation ? 'Use this device’s location instead' : 'Use this device’s location'}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1">
          <span className="text-xs font-semibold text-neutral-700">Radius (km)</span>
          <input type="number" inputMode="decimal" min={0.5} max={100} step="0.5" value={f.radiusKm}
            onChange={(e) => d.update({ radiusKm: e.target.value })} className={input} />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-neutral-700">Minimum order (₹)</span>
          <input type="number" inputMode="decimal" min={0} step="10" value={f.minOrder}
            onChange={(e) => d.update({ minOrder: e.target.value })} className={input} />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-neutral-700">Delivery fee (₹)</span>
          <input type="number" inputMode="decimal" min={0} step="5" value={f.fee}
            onChange={(e) => d.update({ fee: e.target.value })} className={input} />
        </label>
      </div>

      {d.error && <p role="alert" className="text-sm text-rose-700">{d.error}</p>}

      {d.dirty && (
        <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white/95 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="px-1 text-sm text-neutral-700">Delivery terms have unsaved changes.</p>
          <div className="flex gap-2">
            <button type="button" onClick={d.discard} disabled={d.saving} className="h-10 cursor-pointer rounded-xl px-4 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 disabled:opacity-40">Discard</button>
            <button type="button" onClick={() => void d.save()} disabled={d.saving} className="h-10 cursor-pointer rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40">
              {d.saving ? 'Saving…' : 'Save delivery terms'}
            </button>
          </div>
        </div>
      )}
      {d.notice && !d.dirty && <p role="status" className="text-sm text-emerald-700">{d.notice}</p>}
    </div>
  );
}
