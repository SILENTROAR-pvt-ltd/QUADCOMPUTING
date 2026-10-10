'use client';

import React from 'react';
import type { CatalogServiceItem } from './types';
import { X, CheckCircle2 } from 'lucide-react';

interface Props {
  activeServices: CatalogServiceItem[];
  onDeactivate: (id: string) => void;
}

export function ActiveServicesBadgeStrip({ activeServices, onDeactivate }: Props) {
  if (activeServices.length === 0) return null;

  const totalSum = activeServices.reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="rounded-2xl border border-zinc-950/10 bg-zinc-900 text-white p-3.5 sm:p-4 shadow-sm animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2.5 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-100">
            {activeServices.length} Selected {activeServices.length === 1 ? 'Service' : 'Services'} Ready to Ingest
          </span>
        </div>
        <div className="text-xs font-mono text-zinc-400">
          Combined Base: <span className="font-bold text-white">₹{totalSum.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2.5">
        {activeServices.map((service) => (
          <span
            key={service.id}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800/90 border border-zinc-700/80 px-2.5 py-1 text-[11px] text-zinc-200"
          >
            <span>{service.name}</span>
            <span className="font-mono text-zinc-400 font-bold">₹{service.price}</span>
            <button
              type="button"
              onClick={() => onDeactivate(service.id)}
              className="text-zinc-400 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
              title="Deselect"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
