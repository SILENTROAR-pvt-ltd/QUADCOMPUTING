'use client';

import React from 'react';
import { ReceiptText, X } from 'lucide-react';
import { BillRequestRow } from './components/BillRequestRow';
import { useBillRequests } from './hooks/useBillRequests';

export interface BillRequestEvent {
  id: string;
  session_id: string | null;
  table_number: string;
  requested_at: string;
  settled_at?: string | null;
  item_count: number;
  running_total: number;
  session_status: string;
}

export interface ActiveTable {
  id: string;
  table_number: string;
  activeSession?: {
    sessionId: string;
    status: string;
    subtotal?: number;
    grandTotal?: number;
    itemsCount?: number;
  };
}

interface BillRequestsModalProps {
  activeTables: ActiveTable[];
  onClose: () => void;
  onSelectTable: (table: ActiveTable) => void;
}

const norm = (val: string) => (val || '').replace(/^(table|t-)\s*/i, '').trim().toUpperCase();

export function BillRequestsModal({ activeTables, onClose, onSelectTable }: BillRequestsModalProps) {
  const { requests, isLoading, error } = useBillRequests();

  const resolveActiveTable = (request: BillRequestEvent): ActiveTable => {
    const reqNorm = norm(request.table_number);
    const found = activeTables.find(
      (t) => (request.session_id && t.activeSession?.sessionId === request.session_id) || norm(t.table_number) === reqNorm
    );
    if (found) return found;

    return {
      id: request.table_number,
      table_number: request.table_number,
      activeSession: {
        sessionId: request.session_id || `sess_${request.table_number}`,
        status: 'bill_requested',
        grandTotal: request.running_total,
        itemsCount: request.item_count,
      },
    };
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="bill-requests-title" className="w-full max-w-xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        <header className="flex items-start justify-between gap-4 border-b border-neutral-100 px-6 py-5 bg-neutral-50/50">
          <div>
            <h2 id="bill-requests-title" className="flex items-center gap-2.5 text-base font-bold text-neutral-900">
              <ReceiptText className="h-5 w-5 text-neutral-800" />
              Bill Settlement Requests
            </h2>
            <p className="mt-1 text-xs text-neutral-500">Live guest bill requests and completed table settlements</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close bill requests" className="rounded-xl border border-neutral-200 bg-white p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="max-h-[65vh] overflow-y-auto p-4 space-y-2.5">
          {isLoading && <div className="py-12 text-center text-sm text-neutral-400 font-mono">Loading bill requests…</div>}
          {!isLoading && error && <p role="alert" className="py-8 text-center text-sm text-rose-600 bg-rose-50 rounded-xl border border-rose-200">{error}</p>}
          {!isLoading && !error && requests.length === 0 && (
            <div className="py-12 text-center">
              <ReceiptText className="mx-auto h-8 w-8 text-neutral-300 stroke-[1.5]" />
              <p className="mt-2 text-sm font-medium text-neutral-600">No bill requests recorded yet</p>
              <p className="text-xs text-neutral-400 mt-0.5">When guests click &ldquo;Request Bill&rdquo;, requests will appear here instantly.</p>
            </div>
          )}
          {requests.map((request) => (
            <BillRequestRow key={request.id} request={request} table={resolveActiveTable(request)} onSelectTable={onSelectTable} onClose={onClose} />
          ))}
        </div>
      </section>
    </div>
  );
}