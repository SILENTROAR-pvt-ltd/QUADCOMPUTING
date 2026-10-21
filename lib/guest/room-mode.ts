// A guest ordering from their room uses the venue's real menu, with the room standing in for the table: the label is
// "RS-<room number>" (no spaces, so it survives the menu's address parsing), orders go through the room endpoint, and
// the screens say "Room 101" instead of "Table RS-101".

const PREFIX = 'RS-';

/** The table label for a room: "RS-101". Letters, digits and hyphens only; the menu allows at most 12. */
export const roomTableLabel = (roomNumber: string) => `${PREFIX}${String(roomNumber).trim().replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`.slice(0, 12);

export const isRoomTable = (table?: string | null) => typeof table === 'string' && table.toUpperCase().startsWith(PREFIX);

/** What to call the table in the guest's own words: "Room 101" for a room, "Table T-05" for a table. */
export function tableLabel(table?: string | null): string {
  if (!table) return 'Your table';
  return isRoomTable(table) ? `Room ${table.slice(PREFIX.length)}` : `Table ${table}`;
}

/** The menu opened for a room: the venue's real menu, in room mode. The room code is the page's key to the room's session. */
export const roomMenuHref = (venueId: string, roomCode: string, roomNumber: string) =>
  `/menu?cafe_id=${encodeURIComponent(venueId)}&table=${encodeURIComponent(roomTableLabel(roomNumber))}&room=${encodeURIComponent(roomCode)}`;
