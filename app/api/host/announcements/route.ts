import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { adminDb } from '@/lib/supabase/admin';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { activeAnnouncements } from '@/lib/services/admin/announcements.service';

export const dynamic = 'force-dynamic';

/** GET /api/host/announcements: the platform notices showing now (maintenance, updates), most severe first. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    return NextResponse.json({ success: true, announcements: await activeAnnouncements(adminDb()) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'HostAnnouncementsGET');
  }
}, 'HostAnnouncementsGET');
