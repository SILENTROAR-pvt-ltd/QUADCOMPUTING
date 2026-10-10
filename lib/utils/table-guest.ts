// Who is at a live table, from the table's session and its order. Sessions hold the guest's session id and
// handle; the name and phone live on the order. A table a host opened has a "host-" session id, a walk-in.
export interface TableSessionFacts {
  guest_session_id?: string | null;
  guest_handle?: string | null;
  created_at?: string | null;
}

export interface TableOrderFacts {
  customer_name?: string | null;
  customer_phone?: string | null;
  created_at?: string | null;
}

export interface TableGuestInfo {
  name: string;
  handle: string | null;
  phone: string | null;
  sessionUid: string | null;
  since: string | null;
  walkIn: boolean;
}

export function tableGuestInfo(session: TableSessionFacts | null | undefined, order: TableOrderFacts | null | undefined): TableGuestInfo {
  const uid = session?.guest_session_id ?? null;
  return {
    name: order?.customer_name?.trim() || (session?.guest_handle ? session.guest_handle : 'Guest'),
    handle: session?.guest_handle ?? null,
    phone: order?.customer_phone ?? null,
    sessionUid: uid,
    since: session?.created_at ?? order?.created_at ?? null,
    walkIn: typeof uid === 'string' && uid.startsWith('host-'),
  };
}
