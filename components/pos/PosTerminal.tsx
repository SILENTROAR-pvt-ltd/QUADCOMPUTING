'use client';

import React, { useEffect } from 'react';
import { LiveTablesWorkspace } from '@/components/host/workspaces/tables/LiveTablesWorkspace';
import { KitchenWorkspace } from '@/components/host/workspaces/KitchenWorkspace';
import { BillingWorkspace } from '@/components/host/workspaces/BillingWorkspace';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import type { StaffRole } from '@/lib/services/staff-auth/staff-roles';
import { PosTerminalHeader } from './PosTerminalHeader';

/** Staff terminals refresh on a short clock: a signed-in staff phone has no realtime channel, so it reads often instead. */
const STAFF_POLL_MS = 4000;

interface PosTerminalProps {
  terminal: StaffRole;
  venueId: string;
  venueName: string;
  actor: { name: string; role: StaffRole | 'OWNER' };
}

/** The role's own workspace under a slim header with who is signed in and a sign-out. */
export function PosTerminal({ terminal, venueId, venueName, actor }: PosTerminalProps) {
  // The cashier's billing screen reads the venue from the workspace store.
  useEffect(() => { useHostWorkspace.setState({ businessId: venueId } as any); }, [venueId]);
  const staff = actor.role !== 'OWNER';

  return (
    <div className="min-h-[100dvh] bg-[#faf9f6] text-neutral-900">
      <PosTerminalHeader venueId={venueId} venueName={venueName} actor={actor} terminal={terminal} />
      <main className="mx-auto w-full max-w-7xl px-3 pb-24 pt-3 sm:px-6">
        {terminal === 'WAITER' && <LiveTablesWorkspace venueId={venueId} pollMs={staff ? STAFF_POLL_MS : undefined} />}
        {terminal === 'CHEF' && <KitchenWorkspace cafeId={venueId} pollMs={staff ? STAFF_POLL_MS : undefined} />}
        {terminal === 'CASHIER' && <BillingWorkspace />}
      </main>
    </div>
  );
}
