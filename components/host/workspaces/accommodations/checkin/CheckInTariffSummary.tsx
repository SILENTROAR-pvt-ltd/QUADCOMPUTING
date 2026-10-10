'use client';

import React from 'react';
import { Receipt, CheckCircle2 } from 'lucide-react';
import type { RoomAddon } from '@/types';

interface Props {
  numNights: number;
  roomPrice: number;
  roomTariffTotal: number;
  checkInAddonsTotal: number;
  chosenAddonsCount: number;
  estimatedTotalWithAddons: number;
  isUpdating: boolean;
  selectedAddonsList?: RoomAddon[];
  adultsCount?: number;
}

export function CheckInTariffSummary({
  numNights,
  roomPrice,
  roomTariffTotal,
  checkInAddonsTotal,
  chosenAddonsCount,
  estimatedTotalWithAddons,
  isUpdating,
  selectedAddonsList = [],
  adultsCount = 1
}: Props) {
  return (
    <>
      {/* SECTION 5: Live Billing Preview */}
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-600">
            <Receipt className="h-4 w-4 text-emerald-600" />
            Live Stay Cost Estimate & Folio Breakdown
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">
            {numNights} Night{numNights > 1 ? 's' : ''} • {adultsCount} Adult{adultsCount > 1 ? 's' : ''}
          </span>
        </div>

        <div className="space-y-2 text-xs text-zinc-600">
          {/* Base Room Tariff Line */}
          <div className="flex justify-between items-center">
            <span>Room Tariff ({numNights} Night{numNights > 1 ? 's' : ''} × ₹{roomPrice.toLocaleString()}):</span>
            <span className="font-mono text-zinc-900 font-semibold">₹{roomTariffTotal.toLocaleString()}</span>
          </div>

          {/* Selected Add-Ons Line & Detailed Breakdown */}
          {checkInAddonsTotal > 0 && (
            <div className="space-y-1.5 pt-1.5 pb-1 border-t border-dashed border-zinc-200">
              <div className="flex justify-between items-center text-emerald-800 font-semibold">
                <span>Selected Add-Ons ({chosenAddonsCount}):</span>
                <span className="font-mono font-bold">+₹{checkInAddonsTotal.toLocaleString()}</span>
              </div>
              <div className="space-y-1 pl-2 text-[11px] text-zinc-500">
                {selectedAddonsList.map((a) => {
                  const lineTotal = a.billingType === 'per_night'
                    ? (Number(a.price) || 0) * numNights
                    : a.billingType === 'per_person_per_day'
                    ? (Number(a.price) || 0) * numNights * Math.max(1, adultsCount)
                    : (Number(a.price) || 0);

                  const billingDescriptor = a.billingType === 'per_night'
                    ? `${numNights} night${numNights > 1 ? 's' : ''}`
                    : a.billingType === 'per_person_per_day'
                    ? `${numNights} night(s) × ${adultsCount} adult(s)`
                    : 'flat stay rate';

                  return (
                    <div key={a.id} className="flex justify-between items-center">
                      <span className="truncate pr-2">
                        • {a.name} <span className="text-zinc-400 text-[10px]">({billingDescriptor})</span>
                      </span>
                      <span className="font-mono text-zinc-700 font-medium shrink-0">
                        ₹{lineTotal.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grand Estimated Total */}
          <div className="border-t border-zinc-200 pt-3 flex justify-between items-baseline">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                Estimated Total Amount:
              </span>
              <p className="text-[10px] text-zinc-400">Taxes & room service orders billed dynamically at checkout</p>
            </div>
            <span className="font-serif text-3xl font-normal text-emerald-600">
              ₹{estimatedTotalWithAddons.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Confirm Action Button */}
      <button
        type="submit"
        disabled={isUpdating}
        className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 py-4 text-sm font-semibold tracking-wide text-white shadow-xl shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {isUpdating ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Registering Guest & Provisioning Keys...
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Confirm Guest Check-In & Issue Key
          </>
        )}
      </button>
    </>
  );
}
