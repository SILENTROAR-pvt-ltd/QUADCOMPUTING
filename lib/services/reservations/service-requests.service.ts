// A guest's request for one of the venue's services from the menu ("Bicycle Rental · ₹250"), for the Services list in
// Reservations. It is the same staff call the bell rings for (type SERVICE), so marking it done anywhere clears it
// everywhere. A room's own calls (housekeeping, towels, late check-out) are named "ROOM 204" and stay with the desk.

/** How far back the list and its count reach: an unanswered request from days ago is not "waiting" any more. */
export const SERVICE_REQUEST_WINDOW_HOURS = 48;
const LIMIT = 60;

export interface ServiceRequest {
  id: string;
  table_number: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

export const serviceRequestsSince = (now = Date.now()) => new Date(now - SERVICE_REQUEST_WINDOW_HOURS * 3600_000).toISOString();

/** Only the venue's service requests from tables, inside the window. Applied to any staff_notifications query. */
export const narrowToServiceRequests = (q: any, now = Date.now()) =>
  q.eq('notification_type', 'SERVICE').not('table_number', 'ilike', 'ROOM %').gte('created_at', serviceRequestsSince(now));

/** The venue's service requests, waiting ones first, newest first within each. */
export async function listServiceRequests(db: any, businessId: string, now = Date.now()): Promise<ServiceRequest[]> {
  const q = db.from('staff_notifications').select('id, table_number, message, status, created_at').eq('business_id', businessId);
  const { data, error } = await narrowToServiceRequests(q, now).order('created_at', { ascending: false }).limit(LIMIT);
  if (error) throw error;
  const rows: ServiceRequest[] = data || [];
  return [...rows.filter((r) => r.status === 'PENDING'), ...rows.filter((r) => r.status !== 'PENDING')];
}
