// The in-room page's calls, one per thing the guest can do. Each returns what the page shows, never throws.

const base = (code: string) => `/api/guest/room/${encodeURIComponent(code)}`;
const json = async (res: Response | null) => (res ? await res.json().catch(() => ({})) : {});

/** The room's state; `error` carries the page's message when there is nothing to show. */
export async function fetchRoomState(code: string): Promise<{ data: any | null; error: string | null }> {
  try {
    const res = await fetch(base(code), { cache: 'no-store' });
    const body = await json(res);
    if (!res.ok || !body.success) return { data: null, error: body.error || 'This room link is not valid.' };
    return { data: body, error: null };
  } catch { return { data: null, error: 'Could not reach the venue. Check your connection.' }; }
}

/** The guest proves the room is theirs with the last four digits of their phone. Returns the error to show, or null. */
export async function verifyRoom(code: string, last4: string): Promise<string | null> {
  try {
    const res = await fetch(`${base(code)}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone_last4: last4 }) });
    const body = await json(res);
    return !res.ok || !body.success ? body.error || 'Those digits do not match.' : null;
  } catch { return 'Network error. Try again.'; }
}

/** A request to the desk (service, late check-out, check-out). Returns the line the page shows for it. */
export async function postRoomAction(code: string, path: string, body: unknown, ok: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${base(code)}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const out = await json(res);
    if (!res.ok || !out.success) return { ok: false, message: out.error || 'Could not reach the desk.' };
    return { ok: true, message: out.duplicate ? 'Already on its way.' : ok };
  } catch { return { ok: false, message: 'Network error. Try again.' }; }
}
