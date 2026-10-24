import React from 'react';
import type { VenueRow } from './types';

const ok = 'border-emerald-200 bg-emerald-50 text-emerald-700';
const warn = 'border-amber-200 bg-amber-50 text-amber-800';
const off = 'border-neutral-200 bg-neutral-50 text-neutral-500';

/**
 * GSTIN (format checked, confirmed by the owner; no government lookup is connected), FSSAI (14 digits), and for venues
 * with rooms whether foreign guests' Form C details have been recorded at check-in.
 */
export function ComplianceBadges({ c }: { c: VenueRow['compliance'] }) {
  const gst = !c.gstin ? { t: 'No GSTIN', cls: off } : !c.gstValid ? { t: 'GSTIN invalid', cls: warn } : c.gstConfirmed ? { t: 'GSTIN ✓', cls: ok } : { t: 'GSTIN unconfirmed', cls: warn };
  const fssai = !c.fssai ? { t: 'No FSSAI', cls: off } : c.fssaiValid ? { t: 'FSSAI ✓', cls: ok } : { t: 'FSSAI invalid', cls: warn };
  return (
    <span className="flex flex-wrap gap-1">
      <span title={c.gstin || 'Not given'} className={`rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${gst.cls}`}>{gst.t}</span>
      <span title={c.fssai || 'Not given'} className={`rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${fssai.cls}`}>{fssai.t}</span>
      {c.rooms > 0 && (
        <span title="Foreign guests recorded at check-in (Form C fields)" className={`rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${c.foreignStays > 0 ? ok : off}`}>
          Form C · {c.foreignStays}
        </span>
      )}
    </span>
  );
}
