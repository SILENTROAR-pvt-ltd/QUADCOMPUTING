'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PhysicalRoom, RoomStayLog } from '@/types';
import type { FolioLine } from '@/lib/services/accommodation/stay-folio.util';
import { requestSettleRoom } from '@/lib/host/open-room-request';
import { EMPTY_SUMMARY as EMPTY, type BillingSummary } from './folio-summary';

export type { BillingSummary };

/** The in-house guest's dossier and live folio, refreshed whenever the room changes. */
export function useOccupiedRoomDossier(room: PhysicalRoom | null, isOpen: boolean, onRoomUpdated: () => void, onClose: () => void, onNavigateToBilling?: (invoiceData: any) => void) {
  const [liveRoom, setLiveRoom] = useState<PhysicalRoom | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedRoomNumber, setEditedRoomNumber] = useState(room?.room_number || '');
  const [isEditingRoomNumber, setIsEditingRoomNumber] = useState(false);
  const [isSavingRoomNumber, setIsSavingRoomNumber] = useState(false);
  const [dossier, setDossier] = useState<{ orders: any[]; tickets: any[]; stayLogs: RoomStayLog[]; folioLines: FolioLine[]; summary: BillingSummary }>(
    { orders: [], tickets: [], stayLogs: [], folioLines: [], summary: EMPTY });

  const loadDossier = useCallback(async (roomId: string) => {
    try {
      const res = await fetch(`/api/host/accommodations/rooms/${roomId}/dossier`, { cache: 'no-store' });
      if (!res.ok) throw new Error('load');
      const data = await res.json();
      if (data.room) setLiveRoom(data.room);
      setDossier({ orders: data.orders || [], tickets: data.tickets || [], stayLogs: data.stayLogs || [], folioLines: data.folioLines || [], summary: data.billingSummary || EMPTY });
    } catch {
      setError('The folio could not be refreshed. The figures shown may be out of date.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // A different room starts fresh; live refreshes of the same room reload the folio only.
  useEffect(() => {
    if (!isOpen || !room?.id) return;
    setLiveRoom(room); setIsLoading(true); setError(null);
    setEditedRoomNumber(room.room_number || ''); setIsEditingRoomNumber(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, room?.id]);
  useEffect(() => { if (isOpen && room?.id) void loadDossier(room.id); }, [isOpen, room, loadDossier]);

  const activeRoom = liveRoom || room;

  const handleSaveRoomNumber = async () => {
    if (!editedRoomNumber.trim() || !activeRoom) return;
    setIsSavingRoomNumber(true); setError(null);
    const res = await fetch(`/api/host/accommodations/rooms/${activeRoom.id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room_number: editedRoomNumber.trim() }),
    }).catch(() => null);
    setIsSavingRoomNumber(false);
    if (res?.ok) { setIsEditingRoomNumber(false); onRoomUpdated(); return; }
    const body = res ? await res.json().catch(() => ({})) : {};
    setError(body.error || 'The room number could not be changed.');
  };

  /**
   * "Check out & bill": the room is handed to the till with its folio and the receipt opens with checkout chosen. The
   * room is released only when that receipt is saved, so a guest is never shown as checked out with their bill unpaid.
   */
  const handleCheckoutAndSettle = () => {
    if (!activeRoom?.id || isCheckingOut) return;
    setIsCheckingOut(true);
    requestSettleRoom({ id: activeRoom.id, room_number: activeRoom.room_number, status: activeRoom.status, guest_name: activeRoom.guest_name });
    onNavigateToBilling?.(null);
    setIsCheckingOut(false);
    onClose();
  };

  const actualRoomServiceOrders = dossier.orders.filter((o) => o.order_type !== 'room_stay');
  return {
    activeRoom, isLoading, isCheckingOut, error, editedRoomNumber, setEditedRoomNumber, isEditingRoomNumber, setIsEditingRoomNumber,
    isSavingRoomNumber, tickets: dossier.tickets, stayLogs: dossier.stayLogs, folioLines: dossier.folioLines,
    actualRoomServiceOrders, effectiveBillingSummary: dossier.summary,
    handleSaveRoomNumber, handleCheckoutAndSettle, loadDossier,
  };
}
