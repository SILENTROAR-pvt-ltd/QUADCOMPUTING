'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { RoomCategory, PhysicalRoom, RoomStatus } from '@/types';
import { FrontDeskGrid } from './accommodations/FrontDeskGrid';
import { CategoryConfigurator } from './accommodations/CategoryConfigurator';
import { ExistingCategoriesList } from './accommodations/ExistingCategoriesList';
import { StayHistoryLedger } from './accommodations/StayHistoryLedger';
import { AccommodationsWorkspaceHeader, type AccommodationsTab as Tab } from './accommodations/AccommodationsWorkspaceHeader';
import { AccommodationsModalsHost } from './accommodations/AccommodationsModalsHost';
import { DEFAULT_COMMON_AMENITIES } from './accommodations/configurator/room-category.constants';
import { useAccommodationsData } from './accommodations/hooks/useAccommodationsData';
import { useCategoryActions } from './accommodations/hooks/useCategoryActions';
import { StayBookingsPanel } from './accommodations/bookings/StayBookingsPanel';
import { StaySettingsCard } from './accommodations/bookings/StaySettingsCard';

/** Front desk, room setup and stay history for a venue's rooms. */
export function AccommodationsWorkspace({ onNavigate }: { onNavigate?: (tab: string, meta?: any) => void }) {
  const data = useAccommodationsData();
  const { categories, rooms } = data;
  const [activeMainTab, setActiveMainTab] = useState<Tab>('front-desk');
  const [successToast, setSuccessToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [editingRoomForModal, setEditingRoomForModal] = useState<PhysicalRoom | null>(null);
  const [editingCategory, setEditingCategory] = useState<RoomCategory | null>(null);
  const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | RoomStatus>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setSuccessToast(''), 4500);
  };
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const reload = () => data.loadData(true);
  const actions = useCategoryActions(reload, showToast, () => setActiveMainTab('front-desk'));

  // The open room follows live data, so a change made elsewhere (or just now) shows in its panel.
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || null;
  const vacantPanelRoom = selectedRoom && selectedRoom.status !== 'OCCUPIED' ? selectedRoom : null;
  const occupiedRoom = selectedRoom && selectedRoom.status === 'OCCUPIED' ? selectedRoom : null;

  return (
    <div className="flex h-full flex-col pb-20 animate-in fade-in duration-300">
      <AccommodationsWorkspaceHeader
        activeMainTab={activeMainTab}
        setActiveMainTab={setActiveMainTab}
        successToast={successToast}
        onDismissToast={() => setSuccessToast('')}
        live={data.live}
      />

      {data.loadError && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          <span>{data.loadError}</span>
          <button type="button" onClick={() => void reload()} className="font-semibold underline underline-offset-2 cursor-pointer">Try again</button>
        </div>
      )}

      {activeMainTab === 'front-desk' && (
        <FrontDeskGrid
          rooms={rooms}
          categories={categories}
          isLoading={data.isLoading}
          isRefreshing={data.isRefreshing}
          statusFilter={statusFilter}
          categoryFilter={categoryFilter}
          searchQuery={searchQuery}
          onStatusFilterChange={setStatusFilter}
          onCategoryFilterChange={setCategoryFilter}
          onSearchQueryChange={setSearchQuery}
          onRefresh={() => void reload()}
          onOpenAddUnit={() => setIsAddUnitModalOpen(true)}
          onSelectRoom={(room) => setSelectedRoomId(room.id)}
          onEditRoom={setEditingRoomForModal}
          onSwitchToConfigurator={() => setActiveMainTab('configurator')}
        />
      )}

      {activeMainTab === 'bookings' && <StayBookingsPanel categories={categories} onShowToast={showToast} />}

      {activeMainTab === 'configurator' && (
        <div className="space-y-12">
          <StaySettingsCard rooms={rooms} onShowToast={showToast} />
          <CategoryConfigurator commonAmenities={DEFAULT_COMMON_AMENITIES} isSubmitting={actions.isSubmitting} onSubmit={actions.createCategory} />
          <ExistingCategoriesList
            categories={categories}
            rooms={rooms}
            onSelectCategoryFilter={(catId) => { setCategoryFilter(catId); setActiveMainTab('front-desk'); }}
            onEditCategory={setEditingCategory}
            onDeleteCategory={actions.deleteCategory}
          />
        </div>
      )}

      {activeMainTab === 'history' && <StayHistoryLedger categories={categories} />}

      <AccommodationsModalsHost
        selectedRoomForPanel={vacantPanelRoom}
        onCloseRoomPanel={() => setSelectedRoomId(null)}
        occupiedRoomForModal={occupiedRoom}
        onCloseOccupiedModal={() => setSelectedRoomId(null)}
        editingRoomForModal={editingRoomForModal}
        onCloseEditingRoomModal={() => setEditingRoomForModal(null)}
        editingCategory={editingCategory}
        onCloseEditingCategoryModal={() => setEditingCategory(null)}
        isAddUnitModalOpen={isAddUnitModalOpen}
        onCloseAddUnitModal={() => setIsAddUnitModalOpen(false)}
        categories={categories}
        rooms={rooms}
        onDataRefresh={() => void reload()}
        onShowToast={showToast}
        onNavigate={onNavigate}
      />
    </div>
  );
}
