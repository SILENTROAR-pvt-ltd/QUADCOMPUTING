'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { RoomCategory, PhysicalRoom } from '@/types';
import type { DisplayStatus } from './accommodations/room-status-style';
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
import type { StayBooking } from './accommodations/bookings/useStayBookings';
import { StaySettingsCard } from './accommodations/bookings/StaySettingsCard';
import { OPEN_ROOM_EVENT, takeOpenRoomRequest } from '@/lib/host/open-room-request';
import { useOpenBookingsRequest } from './accommodations/hooks/useOpenBookingsRequest';

/** Front desk, room setup and stay history for a venue's rooms. */
export function AccommodationsWorkspace({ onNavigate }: { onNavigate?: (tab: string, meta?: any) => void }) {
  const data = useAccommodationsData();
  const { categories, rooms, reservations } = data;
  const [activeMainTab, setActiveMainTab] = useState<Tab>('front-desk');
  const [successToast, setSuccessToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  // The reservation being checked in: picked on the Bookings tab or from a vacant room's panel. Undefined means "follow the
  // room": a free room held by a booking opens with that booking; null means the desk chose to check in without one.
  const [checkInBooking, setCheckInBooking] = useState<StayBooking | null | undefined>(undefined);
  // A check-in the desk chose to take payment for at once: the room stays selected, so its occupied box opens on the
  // payment sheet, for the amount chosen before check-in (null: the whole stay).
  const [payNow, setPayNow] = useState<{ roomId: string; amount: number | null } | null>(null);
  // A reserved guest's arrival: "at the desk" already chosen on the Bookings tab, or checking in on their phone.
  const [deskChosen, setDeskChosen] = useState(false);
  const [selfCheckIn, setSelfCheckIn] = useState<StayBooking | null>(null);
  const [bookingsKey, setBookingsKey] = useState(0);
  const [editingRoomForModal, setEditingRoomForModal] = useState<PhysicalRoom | null>(null);
  const [editingCategory, setEditingCategory] = useState<RoomCategory | null>(null);
  const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | DisplayStatus>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setSuccessToast(''), 4500);
  };
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // A room named from the bell ("Room 204 wants to pay now") opens here, once the rooms are known.
  const [wantedRoom, setWantedRoom] = useState<string | null>(() => takeOpenRoomRequest());
  useEffect(() => {
    const onOpen = (e: Event) => { takeOpenRoomRequest(); setWantedRoom(String((e as CustomEvent).detail || '')); };
    window.addEventListener(OPEN_ROOM_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_ROOM_EVENT, onOpen);
  }, []);
  useEffect(() => {
    if (!wantedRoom || rooms.length === 0) return;
    const room = rooms.find((r) => r.room_number.trim().toLowerCase() === wantedRoom.trim().toLowerCase());
    setWantedRoom(null);
    if (room) { setActiveMainTab('front-desk'); setCheckInBooking(undefined); setSelectedRoomId(room.id); }
  }, [wantedRoom, rooms]);

  useOpenBookingsRequest(() => setActiveMainTab('bookings'));

  const reload = () => { setBookingsKey((k) => k + 1); return data.loadData(true); };
  const closeRoomPanel = () => { setSelectedRoomId(null); setCheckInBooking(undefined); setPayNow(null); setDeskChosen(false); };
  const checkedIn = (roomId: string, p: { payNow: boolean; amount: number | null }) => {
    setCheckInBooking(undefined);
    if (p.payNow) setPayNow({ roomId, amount: p.amount }); else { setSelectedRoomId(null); showToast('Checked in. The stay is paid at checkout.'); }
  };
  const actions = useCategoryActions(reload, showToast, () => setActiveMainTab('front-desk'));

  // The open room follows live data, so a change made elsewhere (or just now) shows in its panel.
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || null;
  const vacantPanelRoom = selectedRoom && selectedRoom.status !== 'OCCUPIED' ? selectedRoom : null;
  const occupiedRoom = selectedRoom && selectedRoom.status === 'OCCUPIED' ? selectedRoom : null;
  const panelBooking = (checkInBooking === undefined ? (selectedRoom?.reserved_for as StayBooking | null | undefined) : checkInBooking) ?? null;

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
          reservations={reservations}
          onOpenBookings={() => setActiveMainTab('bookings')}
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

      {activeMainTab === 'bookings' && (
        <StayBookingsPanel categories={categories} rooms={rooms} onShowToast={showToast} refreshKey={bookingsKey} onChanged={() => void data.loadData(true)}
          onCheckIn={(booking, room) => { setCheckInBooking(booking); setDeskChosen(true); setSelectedRoomId(room.id); }} />
      )}

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
        onCloseRoomPanel={closeRoomPanel}
        checkInBooking={panelBooking}
        onCheckInBookingChange={setCheckInBooking}
        occupiedRoomForModal={occupiedRoom}
        onCloseOccupiedModal={closeRoomPanel}
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
        payNow={payNow}
        onCheckedIn={checkedIn}
        arrivalChosen={deskChosen}
        selfCheckInBooking={selfCheckIn}
        onSelfCheckIn={(booking) => { closeRoomPanel(); setSelfCheckIn(booking); }}
        onCloseSelfCheckIn={() => setSelfCheckIn(null)}
      />
    </div>
  );
}
