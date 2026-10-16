'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { LiveTableLine, type BillLine } from './LiveTableLine';

interface LiveTableBillListProps {
  lines: BillLine[];
  loading: boolean;
  occupied: boolean;
  busyLine: string | null;
  onChangeLine: (line: BillLine, qty: number) => Promise<unknown>;
  onAdd: () => void;
}

/** The table's bill lines, with "remove" asking first. An empty table offers to add items instead. */
export function LiveTableBillList({ lines, loading, occupied, busyLine, onChangeLine, onAdd }: LiveTableBillListProps) {
  const [confirming, setConfirming] = useState<string | null>(null);

  if (loading) {
    return (
      <div role="status" aria-label="Loading the bill" className="space-y-3 pt-1">
        {[0, 1, 2].map((i) => <div key={i} className="shimmer h-14 rounded-xl" style={{ animationDelay: `${i * 90}ms` }} />)}
      </div>
    );
  }
  if (lines.length === 0) {
    return (
      <div className="space-y-3 rounded-2xl border border-dashed border-neutral-300 px-4 py-8 text-center text-xs text-neutral-500">
        <p>{occupied ? 'No items on this table yet.' : 'This table is free. Add items to seat a party.'}</p>
        <button type="button" onClick={onAdd} className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-xl bg-neutral-950 px-4 text-[13px] font-semibold text-white">
          <Plus className="h-3.5 w-3.5" /> Add items
        </button>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-neutral-100">
      {lines.map((line) => (
        <LiveTableLine
          key={line.id}
          line={line}
          confirming={confirming === line.id}
          removing={busyLine === line.id}
          onAskRemove={() => setConfirming(line.id)}
          onConfirmRemove={() => { setConfirming(null); void onChangeLine(line, 0); }}
          onKeep={() => setConfirming(null)}
          onQuantity={(q) => void onChangeLine(line, q)}
        />
      ))}
    </ul>
  );
}
