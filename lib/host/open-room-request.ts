// A guest's call from the bell ("Room 204 wants to pay", "Table T-03 wants the waiter") opens that room or table in
// its workspace. The workspace may not be mounted yet when the host taps, so the request waits here until it is.

export const OPEN_ROOM_EVENT = 'quad:open-room';
export const OPEN_TABLE_EVENT = 'quad:open-table';
const pending: { room: string | null; table: string | null } = { room: null, table: null };

/** Asks the Accommodations workspace to open this room's box as soon as it can. */
export function requestOpenRoom(roomNumber: string) {
  pending.room = roomNumber;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(OPEN_ROOM_EVENT, { detail: roomNumber }));
}

/** Asks the tables or billing workspace to select this table as soon as it can. */
export function requestOpenTable(tableNumber: string) {
  pending.table = tableNumber;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(OPEN_TABLE_EVENT, { detail: tableNumber }));
}

/** The room waiting to be opened, taken once. */
export function takeOpenRoomRequest(): string | null {
  const r = pending.room;
  pending.room = null;
  return r;
}

/** The table waiting to be selected, taken once. */
export function takeOpenTableRequest(): string | null {
  const t = pending.table;
  pending.table = null;
  return t;
}

/** "ROOM 204" (how staff calls name a room) → "204"; a table name → null. */
export function roomNumberFromCall(tableNumber?: string | null): string | null {
  const m = String(tableNumber || '').match(/^ROOM\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

/** Tables are named loosely ("T-03", "Table 3", "3"): the same table under any of them. */
export const sameTable = (a: string, b: string) => {
  const key = (t: string) => t.trim().replace(/^(table|t-?)\s*/i, '').replace(/^0+(?=\d)/, '').toUpperCase();
  return key(a) === key(b);
};
