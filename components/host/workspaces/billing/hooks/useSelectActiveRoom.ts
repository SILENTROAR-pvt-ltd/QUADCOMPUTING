import { useCallback } from 'react';
import { fetchRoomFolioLines } from './handle-room-selection.util';

/**
 * A room, picked the way a table is: its running folio fills the POS at once. Cashback on a room's food is credited by
 * checkout, not by the till, and GST is not charged on the stay. On the receipt the host chooses whether the money is
 * adjusted in the stay (the guest stays checked in) or settles the stay and checks the guest out; a room handed over by
 * the desk's "check out & bill" arrives with checkout already chosen.
 */
export function useSelectActiveRoom(cart: any, setSuccessMessage: (m: string) => void) {
  return useCallback(async (room: any, intent: 'payment' | 'checkout' = 'payment'): Promise<boolean> => {
    if (!room?.id) return false;
    const label = `ROOM ${room.room_number}`;
    cart.setSelectedTableId(null); cart.setSelectedRoomId(room.id); cart.setSelectedTableNumber(label);
    cart.setActiveSessionId(null); cart.setActiveSessionStatus(null); cart.setLinkedGuestHandle(null); cart.setCashbackEnabled(false);
    cart.setRoomSettleIntent?.(intent);
    const say = (m: string, ms = 3500) => { setSuccessMessage(m); setTimeout(() => setSuccessMessage(''), ms); };
    if (String(room.status || '').toUpperCase() !== 'OCCUPIED') {
      cart.setSelectedItems([]); cart.setLinkedOrderId(null); cart.setLinkedGuestName(null); cart.setLinkedGuestPhone(null);
      say(`Room ${room.room_number} selected (${String(room.status || 'vacant').toLowerCase()}, no stay to bill)`);
      return false;
    }
    try {
      const folio = await fetchRoomFolioLines(room.id);
      cart.setSelectedItems(folio.lines); cart.setLinkedOrderId(folio.masterOrderId);
      cart.setLinkedGuestName(folio.guestName || room.guest_name || null); cart.setLinkedGuestPhone(folio.guestPhone); cart.setGstEnabled(false);
      say(intent === 'checkout'
        ? `Room ${room.room_number}: ₹${folio.payable.toLocaleString('en-IN')} to settle · the room is checked out once this bill is saved`
        : `Room ${room.room_number} folio loaded (${folio.lines.length} lines, ${folio.nights} night${folio.nights === 1 ? '' : 's'}) · ₹${folio.payable.toLocaleString('en-IN')} owed · on the receipt, adjust a payment in the stay or check out`, 6000);
      return true;
    } catch (e: any) {
      say(e?.message || `The folio for Room ${room.room_number} could not be loaded.`);
      return false;
    }
  }, [cart, setSuccessMessage]);
}
