'use client';

import React from 'react';
import { Section, input } from './ProfileFields';
import { DAY_NAMES, isAllDay, useOperatingHours } from './useOperatingHours';
import { DeliveryTermsBlock } from './DeliveryTermsBlock';
import { OpenSwitch } from './OpenSwitch';

/** Opening hours, table reservations and delivery terms. Guests see these on the menu. */
export function HoursServicesSection() {
  const h = useOperatingHours();

  return (
    <Section id="hours" title="Hours & services" description="Guests can book a table only inside these hours, and order delivery within your radius.">
      {h.loadError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{h.loadError}</p>}

      {!h.days ? (
        !h.loadError && <div className="h-48 animate-pulse rounded-2xl bg-neutral-100" aria-busy="true" />
      ) : (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-neutral-200 p-4">
            <span>
              <span className="block text-sm font-semibold text-neutral-950">Take table reservations</span>
              <span className="mt-0.5 block text-xs text-neutral-500">Guests pick a time inside opening hours and a free table. You confirm each request.</span>
            </span>
            <OpenSwitch on={h.reservationsOn} onChange={h.setReservationsOn} label="Table reservations" onText="On" offText="Off" size="sm" />
          </div>

          {/* Round the clock: one switch sets every day; the day rows then show it and wait for it to be switched off. */}
          <div className={`flex items-start justify-between gap-4 rounded-2xl border p-4 ${h.open247 ? 'border-emerald-200 bg-emerald-50/60' : 'border-neutral-200'}`}>
            <span>
              <span className="block text-sm font-semibold text-neutral-950">Open 24/7</span>
              <span className="mt-0.5 block text-xs text-neutral-500">{h.open247 ? 'Every day, all day. Switch off to set hours for each day below.' : 'Switch on to be open every day, all day; the hours below are set for you.'}</span>
            </span>
            <OpenSwitch on={h.open247} onChange={h.setOpen247} label="Open 24/7" onText="On" offText="Off" />
          </div>

          <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
            {h.days.map((d) => (
              <li key={d.weekday} className={`grid grid-cols-[6.5rem_1fr] items-center gap-3 px-4 py-3 sm:grid-cols-[8rem_auto_1fr_1fr] sm:gap-4 ${d.isClosed ? 'bg-rose-50/30' : ''}`}>
                <span className="text-sm font-semibold text-neutral-900">{DAY_NAMES[d.weekday]}</span>
                <div className="col-span-2 sm:col-span-1">
                  <OpenSwitch on={!d.isClosed} onChange={(open) => h.updateDay(d.weekday, { isClosed: !open })} label={DAY_NAMES[d.weekday]} disabled={h.open247} size="sm" />
                </div>
                <label className="sr-only" htmlFor={`open-${d.weekday}`}>{DAY_NAMES[d.weekday]} opens</label>
                <input id={`open-${d.weekday}`} type="time" value={d.openTime} disabled={d.isClosed || h.open247} onChange={(e) => h.updateDay(d.weekday, { openTime: e.target.value })}
                  className={`${input} disabled:opacity-40`} />
                <label className="sr-only" htmlFor={`close-${d.weekday}`}>{DAY_NAMES[d.weekday]} closes</label>
                <input id={`close-${d.weekday}`} type="time" value={d.closeTime} disabled={d.isClosed || h.open247} onChange={(e) => h.updateDay(d.weekday, { closeTime: e.target.value })}
                  className={`${input} disabled:opacity-40`} title={isAllDay(d) ? 'All day' : undefined} />
              </li>
            ))}
          </ul>

          {h.error && <p role="alert" className="text-sm text-rose-700">{h.error}</p>}

          {h.dirty && (
            <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white/95 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="px-1 text-sm text-neutral-700">You have unsaved changes.</p>
              <div className="flex gap-2">
                <button type="button" onClick={h.discard} disabled={h.saving} className="h-10 cursor-pointer rounded-xl px-4 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 disabled:opacity-40">Discard</button>
                <button type="button" onClick={() => void h.save()} disabled={h.saving} className="h-10 cursor-pointer rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40">
                  {h.saving ? 'Saving…' : 'Save hours'}
                </button>
              </div>
            </div>
          )}
          {h.notice && !h.dirty && <p role="status" className="text-sm text-emerald-700">{h.notice}</p>}
        </div>
      )}

      <div className="mt-8 border-t border-neutral-200 pt-6">
        <h3 className="text-sm font-semibold text-neutral-950">Delivery</h3>
        <div className="mt-3"><DeliveryTermsBlock /></div>
      </div>
    </Section>
  );
}
