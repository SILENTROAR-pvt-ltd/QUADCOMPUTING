'use client';

import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { gatewayPath, type Terminal } from '@/lib/services/staff-auth/staff-roles';

const LINKS: Array<{ tab: Terminal | null; label: string }> = [
  { tab: null, label: 'Everyone' },
  { tab: 'waiter', label: 'Waiter' },
  { tab: 'kitchen', label: 'Kitchen' },
  { tab: 'cashier', label: 'Cashier' },
];

/** The staff sign-in links: one for everyone, and one per terminal that lists only that role's people. */
export function StaffLinks({ businessId }: { businessId: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const href = (tab: Terminal | null) => `${typeof window !== 'undefined' ? window.location.origin : ''}${gatewayPath(businessId, tab)}`;

  const copy = async (key: string, tab: Terminal | null) => {
    try { await navigator.clipboard.writeText(href(tab)); setCopied(key); setTimeout(() => setCopied(null), 1500); } catch { /* the link is shown to copy by hand */ }
  };

  return (
    <div className="mt-4 space-y-2 rounded-xl bg-neutral-50 p-3">
      <p className="break-all font-mono text-[11px] leading-relaxed text-neutral-700">{href(null)}</p>
      <div className="flex flex-wrap gap-1.5">
        {LINKS.map((l) => (
          <button key={l.label} type="button" onClick={() => void copy(l.label, l.tab)}
            className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-semibold">
            {copied === l.label ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />} {copied === l.label ? 'Copied' : `Copy ${l.label.toLowerCase()} link`}
          </button>
        ))}
      </div>
    </div>
  );
}
