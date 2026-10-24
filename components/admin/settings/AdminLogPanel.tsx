'use client';

import React from 'react';
import { Panel, Empty, ErrorNote } from '../ui/Panel';
import { ago, dateShort } from '../ui/format';
import { useAdminData } from '../ui/useAdminData';

interface AuditAnswer { ready: boolean; actions: Array<{ id: string; admin_email: string | null; action: string; venue_id: string | null; detail: any; created_at: string }> }

const label = (a: string) => a.replace(/^venue_/, '').replace(/_/g, ' ');

/** Every change made from the command center: who, what, which venue, when. Append-only in the database. */
export function AdminLogPanel() {
  const { data, error } = useAdminData<AuditAnswer>('/api/admin/audit', 60_000);
  return (
    <Panel title="Admin log" note="Every plan change, suspension, review, export and notice made from here." pad={false}>
      <div className="p-5 pt-3">
        {error && <ErrorNote>{error}</ErrorNote>}
        {data && !data.ready && <Empty>The admin log starts once supabase/apply-pending-2026-10-24c.sql is applied. Until then, changes from here are refused.</Empty>}
        {data?.ready && data.actions.length === 0 && <Empty>No admin actions yet.</Empty>}
        {data?.ready && data.actions.length > 0 && (
          <ul className="divide-y divide-neutral-100 text-sm">
            {data.actions.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                <span className="min-w-0">
                  <span className="font-semibold capitalize text-neutral-900">{label(a.action)}</span>
                  {a.detail?.request?.planTier && <span className="text-neutral-500"> · {a.detail.request.planTier}</span>}
                  {a.detail?.status && <span className="text-neutral-500"> · {a.detail.status}</span>}
                  {a.detail?.title && <span className="text-neutral-500"> · {a.detail.title}</span>}
                  <span className="block text-xs text-neutral-500">{a.admin_email || 'admin'}{a.venue_id ? ` · venue ${a.venue_id.slice(0, 8)}` : ''}</span>
                </span>
                <span className="text-xs text-neutral-500" title={dateShort(a.created_at)}>{ago(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
