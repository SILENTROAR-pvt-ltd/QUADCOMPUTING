import { adminDb } from '@/lib/supabase/admin';
import { UUID_REGEX } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { adminGate, fail, ok } from '@/lib/services/admin/admin-route';
import { listTickets, loadLiveStays, updateTicket } from '@/lib/services/admin/support.service';

export const dynamic = 'force-dynamic';

/** GET /api/admin/support?status= : the ticket queue (urgent first) and every occupied room, overdue ones first. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const gate = await adminGate(request);
    if (gate.error) return gate.error;
    const db = adminDb();
    const [queue, stays] = await Promise.all([listTickets(db, new URL(request.url).searchParams.get('status')), loadLiveStays(db)]);
    return ok({ ...queue, stays });
  } catch (error) {
    return handleApiError(error, request, 'AdminSupportGET');
  }
}, 'AdminSupportGET');

/** PATCH { id, status?, admin_note? }: work a ticket. The venue sees the status and the note in My profile. */
export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  try {
    const gate = await adminGate(request);
    if (gate.error) return gate.error;
    const body = await request.json().catch(() => null);
    if (!UUID_REGEX.test(String(body?.id ?? ''))) return fail('Choose a ticket.');
    const res = await updateTicket(adminDb(), gate.actor, body.id, body);
    return res.ok ? ok({ ticket: res.ticket }) : fail(res.error);
  } catch (error) {
    return handleApiError(error, request, 'AdminSupportPATCH');
  }
}, 'AdminSupportPATCH');
