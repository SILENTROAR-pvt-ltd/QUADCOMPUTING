// What this phone knew about its stay, kept in the browser: once the desk settles the bill and checks the room out, the
// room's API has no stay to show any more, but the guest who just left still has the page open or comes back to it.
// This lets that page say "you are checked out, here is where your bill and cashback are" instead of "no stay here".

const PREFIX = 'vc_last_stay:';
const TTL_MS = 36 * 3600_000;

export interface LastStay {
  roomNumber: string;
  venue: { id: string; name: string; slug: string | null };
  nights: number;
  total: number;
  dining: number;
  checkIn: string | null;
  at: number;
  /** When this phone first saw the stay gone, or null while it is live. */
  checkedOutAt: string | null;
}

function read(code: string): LastStay | null {
  try {
    const raw = localStorage.getItem(PREFIX + code);
    if (!raw) return null;
    const s = JSON.parse(raw) as LastStay;
    if (!s?.at || Date.now() - s.at > TTL_MS) { localStorage.removeItem(PREFIX + code); return null; }
    return s;
  } catch { return null; }
}

function write(code: string, s: LastStay) {
  try { localStorage.setItem(PREFIX + code, JSON.stringify(s)); } catch {}
}

/** The stay is live and this phone is confirmed in it: keep what the page will need after it ends. */
export function rememberStay(code: string, s: Omit<LastStay, 'at' | 'checkedOutAt'>): void {
  write(code, { ...s, at: Date.now(), checkedOutAt: null });
}

export const readLastStay = (code: string): LastStay | null => read(code);

/** The stay is gone from the room. The first time this phone sees that, the moment is kept; later reads return the same record. */
export function markCheckedOut(code: string, now = new Date()): LastStay | null {
  const s = read(code);
  if (!s) return null;
  if (s.checkedOutAt) return s;
  const out = { ...s, checkedOutAt: now.toISOString() };
  write(code, out);
  return out;
}
