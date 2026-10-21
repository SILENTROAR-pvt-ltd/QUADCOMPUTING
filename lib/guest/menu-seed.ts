// Reads made before the guest asks for them. The room page knows the guest is about to tap "Order food to my room",
// the tab bar knows Stay is one tap away: they read the data then and leave it in sessionStorage; the next page draws
// from it at once and refreshes behind it. Short-lived: a few minutes, then it is ignored.

const TTL_MS = 3 * 60_000;
const MENU_PREFIX = 'vc_menu_seed:';
const ROOM_PREFIX = 'vc_room_menu:';
const JSON_PREFIX = 'vc_seed:';

export interface RoomMenuSeed { roomNumber: string; venueName: string; dining: { enabled: boolean; open: boolean; message: string } }

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { at, value } = JSON.parse(raw) as { at: number; value: T };
    if (!at || Date.now() - at > TTL_MS) { sessionStorage.removeItem(key); return null; }
    return value;
  } catch { return null; }
}

function write(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), value })); } catch {}
}

/** A successful JSON response read ahead of time for this URL, or null. */
export const readJsonSeed = <T = any>(url: string): T | null => (typeof window === 'undefined' ? null : read<T>(JSON_PREFIX + url));
export const writeJsonSeed = (url: string, value: unknown) => write(JSON_PREFIX + url, value);

/** Drops every kept answer whose URL starts like this: after check-in, the Stay answers kept before it are out of date. */
export function forgetJsonSeeds(urlPrefix: string) {
  try {
    Object.keys(sessionStorage).filter((k) => k.startsWith(JSON_PREFIX + urlPrefix)).forEach((k) => sessionStorage.removeItem(k));
  } catch {}
}

/** Reads a JSON endpoint now and keeps the answer for the page about to open. Quiet on any failure: that page fetches for itself. */
export async function prefetchJson(url: string): Promise<void> {
  if (typeof window === 'undefined' || readJsonSeed(url)) return;
  try {
    const res = await fetch(url, { priority: 'low' } as RequestInit);
    const data = await res.json().catch(() => null);
    if (res.ok && data?.success) writeJsonSeed(url, data);
  } catch {}
}

/** The menu API's URL for a table or room at a venue, the same one the menu page requests. */
export const menuApiUrl = (venueId: string, table: string) => `/api/guest/menu?${new URLSearchParams({ table, cafe_id: venueId })}`;

export const readMenuSeed = (url: string): any | null => read(MENU_PREFIX + url);

/** Reads the menu now and keeps it for the page about to open. */
export async function prefetchMenu(url: string): Promise<void> {
  if (typeof window === 'undefined' || readMenuSeed(url)) return;
  try {
    const res = await fetch(url, { priority: 'low' } as RequestInit);
    const data = await res.json().catch(() => null);
    if (res.ok && data?.success) write(MENU_PREFIX + url, data);
  } catch {}
}

export const readRoomMenuSeed = (roomCode: string): RoomMenuSeed | null => read(ROOM_PREFIX + roomCode);
export const writeRoomMenuSeed = (roomCode: string, seed: RoomMenuSeed) => write(ROOM_PREFIX + roomCode, seed);
