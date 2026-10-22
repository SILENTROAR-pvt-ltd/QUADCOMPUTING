'use client';

import React, { useEffect } from 'react';
import { LiveTablesWorkspace } from '@/components/host/workspaces/tables/LiveTablesWorkspace';
import { KitchenWorkspace } from '@/components/host/workspaces/KitchenWorkspace';
import { BillingWorkspace } from '@/components/host/workspaces/BillingWorkspace';
import { useStaffAlerts } from '@/components/host/control-center/useStaffAlerts';
import { StaffAlertsTray } from '@/components/host/control-center/StaffAlertsTray';
import { HostAlertSound } from '@/components/host/control-center/HostAlertSound';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import { requestOpenTable } from '@/lib/host/open-room-request';
import type { StaffRole } from '@/lib/services/staff-auth/staff-roles';
import { PosTerminalHeader } from './PosTerminalHeader';

/** How often a staff terminal re-reads when its push channel (the venue's floor ping) is down. While it is up, it reads on each ping. */
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
  // Guest calls (the waiter, the bill) ring on the waiter's and cashier's terminals and open the table they came from.
  // The kitchen has its own bell for new orders and cannot read the calls, so it is left out.
  const hearsCalls = terminal !== 'CHEF';
  const alerts = useStaffAlerts(hearsCalls ? venueId : undefined);

  return (
    <div className="min-h-[100dvh] bg-[#faf9f6] text-neutral-900">
      <PosTerminalHeader venueId={venueId} venueName={venueName} actor={actor} terminal={terminal} />
      <main className="mx-auto w-full max-w-7xl px-3 pb-24 pt-3 sm:px-6">
        {terminal === 'WAITER' && <LiveTablesWorkspace venueId={venueId} pollMs={staff ? STAFF_POLL_MS : undefined} />}
        {terminal === 'CHEF' && <KitchenWorkspace cafeId={venueId} pollMs={staff ? STAFF_POLL_MS : undefined} />}
        {terminal === 'CASHIER' && <BillingWorkspace />}
      </main>
      {hearsCalls && (
        <>
          <StaffAlertsTray alerts={alerts.alerts} freshIds={alerts.freshIds} onResolve={alerts.resolve}
            onOpen={(t) => { if (t.table) requestOpenTable(t.table); }} />
          <HostAlertSound alerts={alerts.alerts} freshIds={alerts.freshIds} kotArrivals={0} />
        </>
      )}
    </div>
  );
}
