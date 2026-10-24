'use client';

import React from 'react';
import { ComplianceBadges } from './ComplianceBadges';
import { dateShort, inr } from '../ui/format';
import { phaseText, REVIEW_LOOK, type VenueRow } from './types';

/** All venues as rows; a row opens the venue's record. Money is the last 30 days; dues are unpaid ₹3 fees. */
export function VenueTable({ venues, onOpen }: { venues: VenueRow[]; onOpen: (id: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-[#f0f0ed] text-[12px] text-neutral-500">
            <th className="px-5 py-3 font-medium">Venue</th><th className="py-3 pr-4 font-medium">Plan</th><th className="py-3 pr-4 font-medium">GMV · 30 d</th>
            <th className="py-3 pr-4 font-medium">Wallet / dues</th><th className="py-3 pr-4 font-medium">Compliance</th><th className="py-3 pr-4 font-medium">Review</th><th className="py-3 pr-5 font-medium">Joined</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f3f3f0]">
          {venues.map((v) => {
            const review = REVIEW_LOOK[v.review?.status || 'pending'];
            return (
              <tr key={v.id} onClick={() => onOpen(v.id)} className="cursor-pointer hover:bg-[#fafaf8]">
                <td className="px-5 py-3">
                  <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(v.id); }} className="text-left font-semibold text-neutral-950 hover:underline cursor-pointer">{v.name}</button>
                  <span className="block text-[11px] text-neutral-500">{[v.city, v.owner].filter(Boolean).join(' · ') || '—'}</span>
                </td>
                <td className="py-3 pr-4">
                  <span className="block font-medium text-neutral-900">{v.plan.name}</span>
                  <span className={`block text-[11px] ${v.plan.status === 'suspended' ? 'font-semibold text-rose-600' : 'text-neutral-500'}`}>{phaseText(v.plan)}{v.plan.vibeyUntil && Date.parse(v.plan.vibeyUntil) > Date.now() ? ' · Vibey' : ''}</span>
                </td>
                <td className="py-3 pr-4 tabular-nums">
                  <span className="block font-medium text-neutral-900">{inr(v.last30.gmv)}</span>
                  <span className="block text-[11px] text-neutral-500">{v.last30.orders} bills{v.last30.lastDay ? ` · last ${dateShort(v.last30.lastDay)}` : ''}</span>
                </td>
                <td className="py-3 pr-4 tabular-nums">
                  <span className="block text-neutral-900">{inr(v.wallet, 2)}</span>
                  <span className={`block text-[11px] ${v.dues > 0 ? 'font-semibold text-rose-600' : 'text-neutral-500'}`}>{v.dues > 0 ? `${inr(v.dues)} due` : 'No dues'}</span>
                </td>
                <td className="py-3 pr-4"><ComplianceBadges c={v.compliance} /></td>
                <td className="py-3 pr-4"><span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${v.review ? review.cls : 'border-neutral-200 bg-neutral-50 text-neutral-500'}`}>{v.review ? review.label : 'Not reviewed'}</span></td>
                <td className="py-3 pr-5 text-neutral-500">{dateShort(v.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
