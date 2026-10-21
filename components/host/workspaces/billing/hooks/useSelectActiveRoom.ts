import { useCallback } from 'react';
import { fetchRoomFolioLines } from './handle-room-selection.util';

/**
 * A room, picked the way a table is: its running folio fills the POS at once. Cashback on a room's food is credited by
 * checkout, not by the till, and GST is not charged on the stay. Settling the loaded bill checks the guest out.
 */
export function useSelectActiveRoom(cart: any, setSuccessMessage: (m: string) => void) {
  return useCallback(async (room: any) => {
    if (!room?.id) return;
    const label = `ROOM ${room.room_number}`;
    cart.setSelectedTableId(null); cart.setSelectedRoomId(room.id); cart.setSelectedTableNumber(label);
    cart.setActiveSessionId(null); cart.setActiveSessionStatus(null); cart.setLinkedGuestHandle(null); cart.setCashbackEnabled(false);
    const say = (m: string, ms = 3500) => { setSuccessMessage(m); setTimeout(() => setSuccessMessage(''), ms); };
    if (String(room.status || '').toUpperCase() !== 'OCCUPIED') {
      cart.setSelectedItems([]); cart.setLinkedOrderId(null); cart.setLinkedGuestName(null); cart.setLinkedGuestPhone(null);
      say(`Room ${room.room_number} selected (${String(room.status || 'vacant').toLowerCase()}, no stay to bill)`);
      return;
    }
    try {
      const folio = await fetchRoomFolioLines(room.id);
      cart.setSelectedItems(folio.lines); cart.setLinkedOrderId(folio.masterOrderId);
      cart.setLinkedGuestName(folio.guestName || room.guest_name || null); cart.setLinkedGuestPhone(folio.guestPhone); cart.setGstEnabled(false);
      say(`Room ${room.room_number} folio loaded (${folio.lines.length} lines, ${folio.nights} night${folio.nights === 1 ? '' : 's'}) · ₹${folio.payable.toLocaleString('en-IN')} to settle at checkout`, 5000);
    } catch (e: any) {
      say(e?.message || `The folio for Room ${room.room_number} could not be loaded.`);
    }
  }, [cart, setSuccessMessage]);
}
