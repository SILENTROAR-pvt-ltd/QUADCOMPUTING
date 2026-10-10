'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Inbox } from 'lucide-react';
import { AdminTopupHeader } from '@/components/admin/topup-desk/AdminTopupHeader';
import { AdminTopupCard } from '@/components/admin/topup-desk/AdminTopupCard';
import { useAdminTopupDesk } from '@/components/admin/topup-desk/hooks/useAdminTopupDesk';

export default function DedicatedAdminTopupDeskPage() {
  const {
    requests,
    pendingCount,
    loading,
    processingId,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    fetchRequests,
    handleAction,
  } = useAdminTopupDesk();

  return (
    <div className="min-h-screen bg-[#faf9f6] text-neutral-900 selection:bg-neutral-900 selection:text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/host/control-center"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Host Workspace</span>
          </Link>
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 font-semibold">
            Isolated Admin Desk v1.0
          </span>
        </div>

        <AdminTopupHeader
          pendingCount={pendingCount}
          loading={loading}
          statusFilter={statusFilter}
          searchQuery={searchQuery}
          onFilterChange={setStatusFilter}
          onSearchChange={setSearchQuery}
          onRefresh={fetchRequests}
        />

        <main className="space-y-4">
          {loading ? (
            <div className="py-16 text-center text-xs text-neutral-400 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 rounded-full border-2 border-neutral-300 border-t-neutral-900 animate-spin" />
              <span>Loading payment verification requests...</span>
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-neutral-200 p-16 text-center space-y-3 bg-white/60">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400">
                <Inbox className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-medium text-neutral-900">No Top-Up Requests</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                There are currently no manual UTR payment requests matching the selected filter ({statusFilter}).
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <AdminTopupCard
                  key={req.id}
                  req={req}
                  isProcessing={processingId === req.id}
                  onApprove={(id) => handleAction(id, 'approve')}
                  onReject={(id) => handleAction(id, 'reject')}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
