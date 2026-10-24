'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { ComplianceBadges } from './ComplianceBadges';
import { VenueActions } from './VenueActions';
import { ago, dateShort, inr } from '../ui/format';
import { useAdminData } from '../ui/useAdminData';
import { phaseText, REVIEW_LOOK, type VenueRow } from './types';

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-4 py-1.5 text-[13px]"><dt className="text-neutral-500">{k}</dt><dd className="text-right font-medium text-neutral-900">{v || '—'}</dd></div>;
}

/** One venue's record in a side sheet: who, plan, money, compliance, the actions, and its admin log. */
export function VenueDrawer({ venue, onClose, onChanged }: { venue: VenueRow; onClose: () => void; onChanged: () => void }) {
  const log = useAdminData<{ ready: boolean; actions: any[] }>(`/api/admin/venues/${venue.id}`, 0);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  const review = venue.review ? REVIEW_LOOK[venue.review.status] : null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label={venue.name} onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-neutral-950">{venue.name}</h2>
            <p className="text-[12px] text-neutral-500">{[venue.city, venue.state].filter(Boolean).join(', ') || 'City not set'} · joined {dateShort(venue.createdAt)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <dl className="mt-5 divide-y divide-[#f3f3f0]">
          <Row k="Owner" v={venue.owner} /><Row k="Email" v={venue.email} /><Row k="Phone" v={venue.phone} /><Row k="Legal name" v={venue.legalName} />
          <Row k="Type" v={venue.categories.join(', ')} />
          <Row k="Plan" v={<>{venue.plan.name} <span className="font-normal text-neutral-500">· {phaseText(venue.plan)}</span></>} />
          <Row k="Vibey add-on" v={venue.plan.vibeyUntil ? `until ${dateShort(venue.plan.vibeyUntil)}` : 'No'} />
          <Row k="Setup ₹599" v={venue.plan.setupPaid ? 'Paid or waived' : 'Owed'} />
          <Row k="GMV · last 30 days" v={`${inr(venue.last30.gmv)} · ${venue.last30.orders} bills`} />
          <Row k="Wallet / dues" v={`${inr(venue.wallet, 2)} · ${inr(venue.dues)} due`} />
          <Row k="Compliance" v={<ComplianceBadges c={venue.compliance} />} />
          <Row k="Review" v={review ? <>{review.label}{venue.review?.note ? <span className="block text-[11px] font-normal text-neutral-500">{venue.review.note}</span> : null}</> : 'Not reviewed'} />
        </dl>

        <div className="mt-5"><VenueActions venue={venue} onDone={() => { onChanged(); void log.refresh(); }} /></div>

        <div className="mt-6 border-t border-[#f0f0ed] pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Admin log for this venue</p>
          {!log.data?.ready ? <p className="mt-2 text-[12px] text-neutral-500">The admin log starts once supabase/apply-pending-2026-10-24c.sql is applied.</p>
            : log.data.actions.length === 0 ? <p className="mt-2 text-[12px] text-neutral-500">No admin actions on this venue yet.</p>
            : <ul className="mt-2 space-y-1.5">{log.data.actions.map((a: any) => (
                <li key={a.id} className="flex justify-between gap-3 text-[12px]"><span className="capitalize text-neutral-800">{a.action.replace(/^venue_/, '').replace(/_/g, ' ')}<span className="text-neutral-500"> · {a.admin_email}</span></span><span className="shrink-0 text-neutral-500">{ago(a.created_at)}</span></li>
              ))}</ul>}
        </div>
      </aside>
    </div>
  );
}
