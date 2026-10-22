'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CONTROL_CENTER_TABS, ControlCenterTab } from './ControlCenterHeader';
import { AdminGatekeeperModal } from '@/components/host/modals/AdminGatekeeperModal';
import { useControlCenterSecurity } from './control-center/useControlCenterSecurity';
import { useBillRequests } from './control-center/useBillRequests';
import { usePendingKot } from './control-center/usePendingKot';
import { DesktopSidebar } from './control-center/DesktopSidebar';
import { MobileNavDrawer } from './control-center/MobileNavDrawer';
import { WorkspaceViewRouter } from './control-center/WorkspaceViewRouter';
import { useStaffAlerts } from './control-center/useStaffAlerts';
import { useRoomRequests } from './control-center/useRoomRequests';
import { StaffAlertsTray } from './control-center/StaffAlertsTray';
import { requestOpenRoom, requestOpenTable } from '@/lib/host/open-room-request';
import { alertCountsByTab } from '@/lib/host/alert-routing';
import { HostAlertSound } from './control-center/HostAlertSound';
import { useVenueTabGuard } from './control-center/useVenueTabGuard';
import { useCopilotHost } from './vibey/useCopilotHost';
import { MasterPinNotice } from './control-center/MasterPinNotice';

interface ControlCenterWorkspaceProps {
  /** Resolved server-side from the authenticated host's session and the
   * `?business_id=` URL param, checked against the venues this host owns
   * (see app/host/control-center/page.tsx). */
  initialBusinessId?: string;
  initialBusinessName?: string;
}

export default function ControlCenterWorkspace({
  initialBusinessId = '',
  initialBusinessName = 'Venue',
}: ControlCenterWorkspaceProps = {}) {
  const searchParams = useSearchParams();

  const initialTab = (searchParams.get('tab') as ControlCenterTab) || 'billing';
  const [activeTab, setActiveTab] = useState<ControlCenterTab>(initialTab);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Sync state if query param changes
  useEffect(() => {
    const tabParam = searchParams.get('tab') as ControlCenterTab;
    if (tabParam && (CONTROL_CENTER_TABS.some((t) => t.id === tabParam) || (tabParam as string) === 'analytics')) {
      const resolvedTab = ((tabParam as string) === 'analytics' ? 'dashboard' : tabParam) as ControlCenterTab;
      setActiveTab(resolvedTab);
    }
  }, [searchParams]);

  const switchTab = (tab: ControlCenterTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    // Shallow URL update: tabs are client-side views, so don't re-run the
    // server page (session check + venue lookup) on every tab click.
    window.history.replaceState(null, '', `/host/control-center?${params.toString()}`);
  };

  const {
    securityStatus, isMasterUnlocked, showGatekeeper, isTabProtected,
    handleUnlock, handleCancelUnlock, handleLockSession, handleUnlockRequest, setPendingLockedTab, setShowGatekeeper,
  } = useControlCenterSecurity(activeTab, switchTab);
  useVenueTabGuard(activeTab, switchTab);
  const { billRequests } = useBillRequests(initialBusinessId);

  // The server page validated ?business_id= against the host's own venues and redirected before
  // render if it was missing or foreign, so this is always the venue shown in the URL.
  const venueId = initialBusinessId;
  const venueName = initialBusinessName;
  const { pendingKotCount, kotArrivals } = usePendingKot(venueId);
  const staffAlerts = useStaffAlerts(venueId);
  // Vibey, the read-only co-pilot: on every tab, honouring the master-PIN lock of this screen.
  const copilot = useCopilotHost(venueId, activeTab, isMasterUnlocked, (tab) => handleTabChange(tab as ControlCenterTab));

  const handleTabChange = (tab: ControlCenterTab | 'analytics') => {
    const resolvedTab = ((tab === 'analytics' ? 'dashboard' : tab) as ControlCenterTab);
    setMobileDrawerOpen(false);
    // A locked section asks for the master PIN first.
    if (isTabProtected(resolvedTab) && !isMasterUnlocked) {
      setPendingLockedTab(resolvedTab);
      setShowGatekeeper(true);
      return;
    }
    switchTab(resolvedTab);
  };

  // Each waiting call lights the workspace it belongs to, so the desk sees where it is wanted without opening the tray.
  // A room's own pending request (check-out, pay now) keeps Accommodations lit even after the bell's call was cleared.
  const roomRequests = useRoomRequests(venueId);
  const alertCounts = alertCountsByTab(staffAlerts.alerts);
  alertCounts.accommodations = Math.max(alertCounts.accommodations || 0, roomRequests);
  const navProps = {
    activeTab, onTabChange: handleTabChange, securityStatus, isMasterUnlocked, isTabProtected,
    onLockSession: handleLockSession, onUnlockRequest: handleUnlockRequest, billRequests, venueName, venueId,
    onOpenCopilot: copilot.open, alertCounts,
  };

  return (
    <div className="flex min-h-screen w-full bg-[#faf9f6] text-zinc-900 font-sans antialiased">
      {showGatekeeper && <AdminGatekeeperModal onUnlock={handleUnlock} onCancel={handleCancelUnlock} />}

      <DesktopSidebar {...navProps} pendingKotCount={pendingKotCount} />

      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <MobileNavDrawer {...navProps} mobileDrawerOpen={mobileDrawerOpen} setMobileDrawerOpen={setMobileDrawerOpen} />
        <MasterPinNotice securityStatus={securityStatus} onOpenSecurity={() => handleTabChange('profile')} />
        <WorkspaceViewRouter activeTab={activeTab} venueId={venueId} onNavigate={handleTabChange} />
      </div>

      <StaffAlertsTray alerts={staffAlerts.alerts} freshIds={staffAlerts.freshIds} onResolve={staffAlerts.resolve}
        onOpen={(t) => { if (t.room) requestOpenRoom(t.room); else if (t.table) requestOpenTable(t.table); handleTabChange(t.tab); }} />
      {/* On every tab: the bell for new orders and guest calls. */}
      <HostAlertSound alerts={staffAlerts.alerts} freshIds={staffAlerts.freshIds} kotArrivals={kotArrivals} />
      {copilot.drawer}
    </div>
  );
}
