'use client';

import React from 'react';
import { Clock3 } from 'lucide-react';
import type { BillRequestEvent, ActiveTable } from '../BillRequestsModal';

interface Props {
  request: BillRequestEvent;
  table: ActiveTable;
  onSelectTable: (table: ActiveTable) => void;
  onClose: () => void;
}

export function BillRequestRow({ request, table, onSelectTable, onClose }: Props) {
  const isSettled = Boolean(
    request.settled_at ||
    request.session_status === 'closed' ||
    request.session_status === 'settled'
  );
  const isPending = !isSettled;

  return (
    <button
      type="button"
      disabled={isSettled}
      onClick={() => {
        if (isPending) {
          onSelectTable(table);
          onClose();
        }
      }}
      className={`flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition-all ${
        isPending
          ? 'border-sky-300 bg-sky-50/50 hover:bg-sky-50/80 hover:border-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.2)] ring-1 ring-sky-200/50 cursor-pointer'
          : 'border-neutral-200 bg-neutral-50/60 opacity-75 cursor-default'
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold text-neutral-900">
            Table {request.table_number}
          </span>

          {isPending ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 border border-sky-300 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-950 shadow-[0_0_8px_rgba(14,165,233,0.3)]">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-ping" />
              Pending
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-neutral-200/70 border border-neutral-300/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
              Settled
            </span>
          )}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 font-mono">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3 w-3 text-neutral-400" />
            {new Date(request.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span>•</span>
          <span>{request.item_count} items</span>
          {request.settled_at && (
            <>
              <span>•</span>
              <span className="text-neutral-400">
                Paid {new Date(request.settled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <span className="block font-mono text-base font-bold text-neutral-900">
          ₹{Number(request.running_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
        {isPending && (
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-neutral-900 hover:underline">
            Load Folio →
          </span>
        )}
      </div>
    </button>
  );
}
