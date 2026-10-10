'use client';

import React from 'react';

interface BillRequestBannerProps {
  billRequestedTables: any[];
  onSelectTable: (table: any) => void;
}

export const BillRequestBanner: React.FC<BillRequestBannerProps> = ({
  billRequestedTables,
  onSelectTable,
}) => {
  if (billRequestedTables.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl bg-white border border-neutral-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 text-neutral-900">
      <div className="flex items-center gap-3">
        <span className="flex h-3 w-3 relative shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-neutral-500" />
        </span>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-neutral-900">
              {billRequestedTables.length === 1
                ? `Final Bill Requested: Table ${billRequestedTables[0].table_number}`
                : `${billRequestedTables.length} Tables Requested Final Bill`}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-mono text-[10px] font-bold border border-neutral-200">
              ACTION REQUIRED
            </span>
          </div>
          <p className="text-xs text-neutral-600 mt-0.5">
            Guest requested bill settlement. Click below to load running items into POS Digital Receipt.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap shrink-0">
        {billRequestedTables.map((tbl) => (
          <button
            key={tbl.id}
            type="button"
            onClick={() => onSelectTable(tbl)}
            className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <span>Auto-Populate Table {tbl.table_number}</span>
            <span className="font-mono text-[11px] opacity-80">
              (₹{tbl.activeSession?.subtotal || tbl.activeSession?.grandTotal || 0})
            </span>
            &rarr;
          </button>
        ))}
      </div>
    </div>
  );
};
