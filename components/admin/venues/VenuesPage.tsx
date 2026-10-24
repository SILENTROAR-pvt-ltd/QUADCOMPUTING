'use client';

import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { Panel, Empty, ErrorNote } from '../ui/Panel';
import { useAdminData } from '../ui/useAdminData';
import { VenueTable } from './VenueTable';
import { VenueDrawer } from './VenueDrawer';
import type { VenueRow } from './types';

const PLAN_FILTERS = [
  { id: 'all', label: 'All plans' }, { id: 'yewe', label: 'You earn, we earn' }, { id: 'm1_pro', label: 'M¹-Pro' }, { id: 'm2_pro', label: 'M²-Pro' },
  { id: 'rhodium_annual', label: 'Rhodium Pro' }, { id: 'trial', label: 'On a free month' }, { id: 'suspended', label: 'Suspended' },
];
const REVIEW_FILTERS = [{ id: 'all', label: 'Any review' }, { id: 'pending', label: 'To review' }, { id: 'needs_docs', label: 'Needs documents' }, { id: 'approved', label: 'Approved' }, { id: 'rejected', label: 'Rejected' }];
const select = 'h-10 rounded-xl border border-[#e3e3df] bg-white px-3 text-[13px] outline-none focus:border-neutral-900 cursor-pointer';

function matchPlan(v: VenueRow, f: string) {
  if (f === 'all') return true;
  if (f === 'suspended') return v.plan.status === 'suspended';
  if (f === 'trial') return v.plan.onTrial;
  if (f === 'yewe') return v.plan.phase === 'payg' || v.plan.phase === 'expired';
  return v.plan.tier === f && v.plan.phase !== 'expired';
}

/** /admin/venues: every venue, searchable and filtered by plan and review; a row opens its record and actions. */
export function VenuesPage() {
  const params = useSearchParams();
  const { data, error, loading, refresh } = useAdminData<{ venues: VenueRow[] }>('/api/admin/venues', 60_000);
  const [q, setQ] = useState('');
  const [plan, setPlan] = useState('all');
  const [review, setReview] = useState(params.get('review') || 'all');
  const [openId, setOpenId] = useState<string | null>(params.get('venue'));

  const venues = useMemo(() => (data?.venues || []).filter((v) => {
    const text = `${v.name} ${v.city || ''} ${v.owner || ''} ${v.email || ''} ${v.compliance.gstin || ''}`.toLowerCase();
    const r = v.review?.status || 'pending';
    return (!q.trim() || text.includes(q.trim().toLowerCase())) && matchPlan(v, plan) && (review === 'all' || r === review);
  }), [data, q, plan, review]);
  const open = (data?.venues || []).find((v) => v.id === openId) || null;

  return (
    <div className="space-y-4">
      {error && <ErrorNote>{error}</ErrorNote>}
      <Panel pad={false}>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, city, owner, GSTIN" aria-label="Search venues"
              className="h-10 w-full rounded-xl border border-[#e3e3df] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-neutral-900" />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <select value={plan} onChange={(e) => setPlan(e.target.value)} className={select} aria-label="Plan">{PLAN_FILTERS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select>
            <select value={review} onChange={(e) => setReview(e.target.value)} className={select} aria-label="Review">{REVIEW_FILTERS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select>
            <span className="text-[12px] text-neutral-500">{venues.length} of {data?.venues.length ?? 0}</span>
          </div>
        </div>
        {!data ? <div className="p-5"><Empty>{loading ? 'Loading venues…' : 'No venues.'}</Empty></div>
          : venues.length === 0 ? <div className="p-5"><Empty>No venue matches these filters.</Empty></div>
          : <VenueTable venues={venues} onOpen={setOpenId} />}
      </Panel>
      {open && <VenueDrawer venue={open} onClose={() => setOpenId(null)} onChanged={() => void refresh()} />}
    </div>
  );
}
