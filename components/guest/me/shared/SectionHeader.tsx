'use client';

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  subtitle: string;
  /** Exports the current list as a CSV; rejects with a sentence on failure. Disabled while the list is empty. */
  onExport: () => Promise<void>;
  canExport: boolean;
  onError: (message: string | null) => void;
}

/** A card's title and line, with "Export CSV" at its right. */
export function SectionHeader({ title, subtitle, onExport, canExport, onError }: SectionHeaderProps) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    onError(null);
    try { await onExport(); } catch (e: any) { onError(e?.message || 'Export failed.'); } finally { setBusy(false); }
  };
  return (
    <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5 sm:px-6">
      <div>
        <h3 className="font-serif text-lg text-neutral-950">{title}</h3>
        <p className="text-xs text-neutral-500">{subtitle}</p>
      </div>
      <button type="button" onClick={() => void run()} disabled={busy || !canExport}
        className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-50 disabled:opacity-40">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Export CSV
      </button>
    </div>
  );
}
