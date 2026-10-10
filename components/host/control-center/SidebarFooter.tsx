'use client';

import React from 'react';
import { BellRing, ExternalLink } from 'lucide-react';
import { SignOutButton } from './SignOutButton';
import type { BillRequestItem } from './useBillRequests';

interface SidebarFooterProps {
  billRequests: BillRequestItem[];
  venueId: string;
  onBilling: () => void;
}

/** Live bill requests, the guest menu link and sign-out. */
export function SidebarFooter({ billRequests, venueId, onBilling }: SidebarFooterProps) {
  const total = billRequests.reduce((sum, r) => sum + r.subtotal, 0);

  return (
    <div className="space-y-2 border-t border-neutral-100 bg-neutral-50/60 p-4">
      {billRequests.length > 0 && (
        <button
          type="button"
          onClick={onBilling}
          className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs font-semibold text-sky-900 hover:bg-sky-100"
        >
          <span className="flex items-center gap-2">
            <BellRing className="h-3.5 w-3.5 text-sky-600" />
            Bill requested
          </span>
          <span className="font-mono">₹{total.toLocaleString('en-IN')}</span>
        </button>
      )}
      <a
        href={`/menu?cafe_id=${venueId}&table=T-01`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
      >
        <span>Guest menu (T-01)</span>
        <ExternalLink className="h-3.5 w-3.5 text-neutral-400" />
      </a>
      <SignOutButton />
    </div>
  );
}
