import { adminDb } from '@/lib/supabase/admin';
import { UUID_REGEX } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { adminGate, fail, ok } from '@/lib/services/admin/admin-route';
import { createAnnouncement, listAnnouncements, parseAnnouncement, withdrawAnnouncement } from '@/lib/services/admin/announcements.service';

export const dynamic = 'force-dynamic';

/** GET /api/admin/announcements: every notice, newest first. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const gate = await adminGate(request);
    if (gate.error) return gate.error;
    return ok(await listAnnouncements(adminDb()));
  } catch (error) {
    return handleApiError(error, request, 'AdminAnnouncementsGET');
  }
}, 'AdminAnnouncementsGET');

/** POST { title, body?, severity, hours? }: publish to every venue's control center now. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const gate = await adminGate(request);
    if (gate.error) return gate.error;
    const parsed = parseAnnouncement(await request.json().catch(() => null));
    if (!parsed.ok) return fail(parsed.error);
    const res = await createAnnouncement(adminDb(), gate.actor, parsed.value);
    return res.ok ? ok({ announcement: res.announcement }) : fail(res.error, 503);
  } catch (error) {
    return handleApiError(error, request, 'AdminAnnouncementsPOST');
  }
}, 'AdminAnnouncementsPOST');

/** PATCH { id }: withdraw a notice (it stops showing at once). */
export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  try {
    const gate = await adminGate(request);
    if (gate.error) return gate.error;
    const body = await request.json().catch(() => null);
    if (!UUID_REGEX.test(String(body?.id ?? ''))) return fail('Choose a notice.');
    const res = await withdrawAnnouncement(adminDb(), gate.actor, body.id);
    return res.ok ? ok({}) : fail(res.error, 404);
  } catch (error) {
    return handleApiError(error, request, 'AdminAnnouncementsPATCH');
  }
}, 'AdminAnnouncementsPATCH');
