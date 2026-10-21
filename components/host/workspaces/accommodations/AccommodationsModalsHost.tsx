'use client';

import React from 'react';
import type { RoomCategory, PhysicalRoom } from '@/types';
import { RoomDetailsPanel } from './RoomDetailsPanel';
import { OccupiedRoomModal } from './OccupiedRoomModal';
import { EditCategoryModal } from './EditCategoryModal';
import { EditRoomModal } from './EditRoomModal';
import { AddUnitModal } from './AddUnitModal';
import type { StayBooking } from './bookings/useStayBookings';

interface AccommodationsModalsHostProps {
  selectedRoomForPanel: PhysicalRoom | null;
  onCloseRoomPanel: () => void;
  checkInBooking: StayBooking | null;
  onCheckInBookingChange: (b: StayBooking | null) => void;
  occupiedRoomForModal: PhysicalRoom | null;
  onCloseOccupiedModal: () => void;
  editingRoomForModal: PhysicalRoom | null;
  onCloseEditingRoomModal: () => void;
  editingCategory: RoomCategory | null;
  onCloseEditingCategoryModal: () => void;
  isAddUnitModalOpen: boolean;
  onCloseAddUnitModal: () => void;
  categories: RoomCategory[];
  rooms: PhysicalRoom[];
  onDataRefresh: () => void;
  onShowToast: (msg: string) => void;
  onNavigate?: (tab: string, meta?: any) => void;
  /** A check-in just finished with "pay now": the occupied-room box opens on the payment sheet for that amount (null: the whole stay). */
  payNow?: { roomId: string; amount: number | null } | null;
  onCheckedIn?: (roomId: string, payment: { payNow: boolean; amount: number | null }) => void;
}

export function AccommodationsModalsHost({
  selectedRoomForPanel,
  onCloseRoomPanel,
  checkInBooking,
  onCheckInBookingChange,
  occupiedRoomForModal,
  onCloseOccupiedModal,
  editingRoomForModal,
  onCloseEditingRoomModal,
  editingCategory,
  onCloseEditingCategoryModal,
  isAddUnitModalOpen,
  onCloseAddUnitModal,
  categories,
  rooms,
  onDataRefresh,
  onShowToast,
  onNavigate,
  payNow = null,
  onCheckedIn,
}: AccommodationsModalsHostProps) {
  return (
    <>
      <RoomDetailsPanel
        room={selectedRoomForPanel}
        onClose={onCloseRoomPanel}
        onRoomUpdated={onDataRefresh}
        booking={checkInBooking}
        onBookingChange={onCheckInBookingChange}
        onCheckedIn={onCheckedIn}
      />

      <OccupiedRoomModal
        room={occupiedRoomForModal}
        isOpen={Boolean(occupiedRoomForModal)}
        onClose={onCloseOccupiedModal}
        onRoomUpdated={onDataRefresh}
        payNowOnOpen={Boolean(occupiedRoomForModal && occupiedRoomForModal.id === payNow?.roomId)}
        payNowAmount={payNow?.amount ?? null}
        onShowToast={onShowToast}
        onNavigateToBilling={(invoiceData) => onNavigate?.('billing', invoiceData)}
      />

      <EditCategoryModal
        category={editingCategory}
        rooms={rooms}
        isOpen={Boolean(editingCategory)}
        onClose={onCloseEditingCategoryModal}
        onUpdated={() => {
          onShowToast(`Updated ${editingCategory?.name} and room units successfully!`);
          onDataRefresh();
        }}
      />

      <EditRoomModal
        room={editingRoomForModal}
        categories={categories}
        isOpen={Boolean(editingRoomForModal)}
        onClose={onCloseEditingRoomModal}
        onUpdated={() => {
          onShowToast(`Updated Room ${editingRoomForModal?.room_number} successfully!`);
          onDataRefresh();
        }}
      />

      <AddUnitModal
        categories={categories}
        isOpen={isAddUnitModalOpen}
        onClose={onCloseAddUnitModal}
        onAdded={() => {
          onShowToast('New physical room unit added successfully!');
          onDataRefresh();
        }}
      />
    </>
  );
}
