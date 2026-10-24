'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { ControlCenterTab } from '../ControlCenterHeader';
import { WorkspaceErrorBoundary } from './WorkspaceErrorBoundary';
import { usePlanFeatures } from '@/components/host/plan/usePlanFeatures';
import { PlanLockedCard } from '@/components/host/plan/PlanLockedCard';
import { PlanReminderBanner } from '@/components/host/plan/PlanReminderBanner';
import { AnnouncementBanner } from '@/components/host/plan/AnnouncementBanner';

// Each workspace is its own bundle, so a host opening one tab does not download the other nine.
// The skeleton shows while the chunk arrives; the view itself is unchanged.
const WorkspaceSkeleton = () => (
  <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading workspace">
    <div className="h-10 w-56 rounded-xl bg-neutral-100" />
    <div className="h-32 w-full rounded-2xl bg-neutral-50" />
    <div className="h-64 w-full rounded-2xl bg-neutral-50" />
  </div>
);
const BillingWorkspace = dynamic(() => import('@/components/host/workspaces/BillingWorkspace').then((m) => m.BillingWorkspace), { loading: WorkspaceSkeleton });
const LiveTablesWorkspace = dynamic(() => import('@/components/host/workspaces/tables/LiveTablesWorkspace').then((m) => m.LiveTablesWorkspace), { loading: WorkspaceSkeleton });
const ReservationsWorkspace = dynamic(() => import('@/components/host/workspaces/reservations/ReservationsWorkspace').then((m) => m.ReservationsWorkspace), { loading: WorkspaceSkeleton });
const DeliveryWorkspace = dynamic(() => import('@/components/host/workspaces/delivery/DeliveryWorkspace').then((m) => m.DeliveryWorkspace), { loading: WorkspaceSkeleton });
const KitchenWorkspace = dynamic(() => import('@/components/host/workspaces/KitchenWorkspace').then((m) => m.KitchenWorkspace), { loading: WorkspaceSkeleton });
const CatalogWorkspace = dynamic(() => import('@/components/host/workspaces/CatalogWorkspace').then((m) => m.CatalogWorkspace), { loading: WorkspaceSkeleton });
const AccommodationsWorkspace = dynamic(() => import('@/components/host/workspaces/AccommodationsWorkspace').then((m) => m.AccommodationsWorkspace), { loading: WorkspaceSkeleton });
const InventoryWorkspace = dynamic(() => import('@/components/host/workspaces/InventoryWorkspace').then((m) => m.InventoryWorkspace), { loading: WorkspaceSkeleton });
const ExpensesWorkspace = dynamic(() => import('@/components/host/workspaces/ExpensesWorkspace').then((m) => m.ExpensesWorkspace), { loading: WorkspaceSkeleton });
const DashboardWorkspace = dynamic(() => import('@/components/host/workspaces/DashboardWorkspace').then((m) => m.DashboardWorkspace), { loading: WorkspaceSkeleton });
const ProfileWorkspace = dynamic(() => import('@/components/host/workspaces/ProfileWorkspace').then((m) => m.ProfileWorkspace), { loading: WorkspaceSkeleton });
const MyGuestsWorkspace = dynamic(() => import('@/components/host/workspaces/guests/MyGuestsWorkspace').then((m) => m.MyGuestsWorkspace), { loading: WorkspaceSkeleton });
const VendorsWorkspace = dynamic(() => import('@/components/host/workspaces/vendors/VendorsWorkspace').then((m) => m.VendorsWorkspace), { loading: WorkspaceSkeleton });
const PaymentsWorkspace = dynamic(() => import('@/components/host/payments/PaymentsWorkspace').then((m) => m.PaymentsWorkspace), { ssr: false, loading: WorkspaceSkeleton });
// Client-only: it reads its cached balance on first render, which would not match the server markup.
const WalletWorkspace = dynamic(() => import('@/components/host/wallet/WalletWorkspace').then((m) => m.WalletWorkspace), { ssr: false, loading: WorkspaceSkeleton });

interface WorkspaceViewRouterProps {
  activeTab: ControlCenterTab;
  venueId: string;
  onNavigate: (tab: ControlCenterTab) => void;
}

export function WorkspaceViewRouter({ activeTab, venueId, onNavigate }: WorkspaceViewRouterProps) {
  const handleNav = (tab: string) => onNavigate(tab as ControlCenterTab);
  // A section the plan lacks shows what it is part of; its running work (orders on the way, stays in house) stays reachable.
  const { has } = usePlanFeatures(venueId);
  const lockedFeature = activeTab === 'delivery' && !has('delivery') ? 'delivery' : activeTab === 'accommodations' && !has('rooms') ? 'rooms' : null;

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full pb-28">
      <AnnouncementBanner />
      {activeTab !== 'wallet' && <PlanReminderBanner venueId={venueId} />}
      {/* A crash in one view is contained here: the sidebar and the other tabs keep working. */}
      <WorkspaceErrorBoundary label={String(activeTab)} resetKey={String(activeTab)}>
        <div className="animate-in fade-in duration-300">
          {lockedFeature && <div className="mb-5"><PlanLockedCard feature={lockedFeature} /></div>}
          {activeTab === 'billing' && <BillingWorkspace onNavigate={handleNav} />}
          {activeTab === 'tables' && <LiveTablesWorkspace venueId={venueId} onNavigate={handleNav} />}
          {activeTab === 'reservations' && <ReservationsWorkspace onNavigate={handleNav} venueId={venueId} />}
          {activeTab === 'delivery' && <DeliveryWorkspace />}
          {activeTab === 'kitchen' && <KitchenWorkspace cafeId={venueId} />}
          {activeTab === 'catalog' && <CatalogWorkspace cafeId={venueId} onNavigate={handleNav} />}
          {activeTab === 'accommodations' && <AccommodationsWorkspace onNavigate={handleNav} />}
          {activeTab === 'inventory' && <InventoryWorkspace />}
          {activeTab === 'expenses' && <ExpensesWorkspace />}
          {(activeTab === 'dashboard' || (activeTab as string) === 'analytics') && <DashboardWorkspace venueId={venueId} onNavigate={handleNav} />}
          {activeTab === 'wallet' && <WalletWorkspace venueId={venueId} onNavigate={handleNav} />}
          {activeTab === 'payments' && <PaymentsWorkspace venueId={venueId} />}
          {activeTab === 'vendors' && <VendorsWorkspace />}
          {activeTab === 'guests' && <MyGuestsWorkspace />}
          {activeTab === 'profile' && <ProfileWorkspace onNavigate={handleNav} />}
        </div>
      </WorkspaceErrorBoundary>
    </main>
  );
}
