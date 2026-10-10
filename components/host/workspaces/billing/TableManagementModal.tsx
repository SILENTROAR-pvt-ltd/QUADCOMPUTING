'use client';

import React from 'react';
import { X } from 'lucide-react';
import { useTableManagement, RestaurantTable } from './hooks/useTableManagement';
import { TableManagementCard } from './components/TableManagementCard';
import { TableManagementForms } from './components/TableManagementForms';

export type { RestaurantTable };

interface Props {
  onClose: () => void;
  onTablesChanged: () => void;
  businessId?: string | null;
}

export function TableManagementModal({ onClose, onTablesChanged, businessId }: Props) {
  const {
    tables, isLoading, isSaving, toast,
    handleAddSingle, handleBulkGenerate, handleUpdateTable,
    handleDelete, handleUpdateStatus, handleReactivate,
  } = useTableManagement(onTablesChanged, businessId);

  const activeTables = tables.filter((t) => t.is_active);
  const inactiveTables = tables.filter((t) => !t.is_active);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-3 backdrop-blur-sm">
      <div className="flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-3xl bg-white border border-neutral-200 text-neutral-900 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-5 sm:px-8">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight">Table Management</h2>
            <p className="mt-1 text-xs text-neutral-500">Configure your restaurant floor plan and seating capacity.</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 space-y-6">
          <TableManagementForms isSaving={isSaving} onAddSingle={handleAddSingle} onBulkGenerate={handleBulkGenerate} />

          {/* Active Tables Grid */}
          <div>
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Active Tables ({activeTables.length})
            </h3>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-700" />
              </div>
            ) : activeTables.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {activeTables.map((table) => (
                  <TableManagementCard
                    key={table.id}
                    table={table}
                    onUpdateTable={handleUpdateTable}
                    onDelete={handleDelete}
                    onUpdateStatus={handleUpdateStatus}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-neutral-200 py-10 text-center">
                <p className="text-sm text-neutral-400">No tables configured yet.</p>
                <p className="mt-1 text-xs text-neutral-400">Use the form above or Bulk Generate to get started.</p>
              </div>
            )}
          </div>

          {/* Inactive Tables */}
          {inactiveTables.length > 0 && (
            <div>
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Deactivated ({inactiveTables.length})
              </h3>
              <div className="space-y-1">
                {inactiveTables.map((table) => (
                  <div key={table.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 opacity-60">
                    <span className="text-xs text-neutral-500">{table.table_number} - {table.seating_capacity} Seats</span>
                    <button onClick={() => handleReactivate(table.id, table.table_number)} className="text-[10px] font-bold uppercase tracking-wider text-neutral-700 hover:text-neutral-900 hover:underline cursor-pointer">
                      Reactivate
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-100 bg-neutral-50 px-6 py-4 sm:px-8">
          <button onClick={onClose} className="w-full rounded-xl border border-neutral-200 bg-white py-3 text-[11px] font-bold uppercase tracking-wider text-neutral-900 transition-colors hover:bg-neutral-100 cursor-pointer">
            Done
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed top-6 left-1/2 z-[200] -translate-x-1/2 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-xs font-bold text-neutral-900 shadow-xl">
              {toast}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
