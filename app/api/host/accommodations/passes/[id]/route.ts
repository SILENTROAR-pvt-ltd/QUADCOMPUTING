import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { adminDb } from '@/lib/supabase/admin';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { masterUnlockRequired } from '@/lib/services/security/master-unlock-guard';
import { hostPassView } from '@/lib/services/stay/host-pass-view';
import { rotatePassLink, StayPassError, type PassRow } from '@/lib/services/stay/stay-pass.service';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/host/accommodations/passes/[id] { action: 'rotate' | 'void' }
 * rotate: a new link for a guest who lost theirs; the old one stops working.
 * void: the stay was cancelled after it was paid. Behind the master PIN and the owner only, because the money already
 *   taken has to be returned by hand: the advance bill stays on the books as the record of what was received.
 */
export const PATCH = withApiErrorBoundary(async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId } = auth;
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const db = adminDb();
    const origin = new URL(request.url).origin;
    const { data: biz } = await db.from('businesses').select('slug').eq('id', businessId).maybeSingle();
    const venue = biz?.slug || businessId;

    if (body?.action === 'rotate') {
      await rotatePassLink(db, businessId, id);
    } else if (body?.action === 'void') {
      const locked = masterUnlockRequired(request, auth);
      if (locked) return locked;
      if ((auth as any).staff) return NextResponse.json({ success: false, error: 'Only the owner cancels a paid stay.' }, { status: 403 });
      const { data, error } = await db.from('stay_passes').update({ status: 'void' }).eq('id', id).eq('business_id', businessId).eq('status', 'issued').select('id').maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ success: false, error: 'This pass was already used or cancelled.' }, { status: 409 });
    } else {
      return NextResponse.json({ success: false, error: 'Choose an action.' }, { status: 400 });
    }

    const { data: pass } = await db.from('stay_passes').select('*').eq('id', id).eq('business_id', businessId).maybeSingle();
    return NextResponse.json({ success: true, pass: pass ? hostPassView(pass as PassRow, origin, venue) : null });
  } catch (error) {
    if (error instanceof StayPassError) return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.code === 'NOT_FOUND' ? 404 : 409 });
    return handleApiError(error, request, 'HostPassPATCH');
  }
}, 'HostPassPATCH');
