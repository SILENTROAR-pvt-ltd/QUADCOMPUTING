import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { adminDb } from '@/lib/supabase/admin';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { ID_PROOF_URL_SECONDS, signedIdProofUrl } from '@/lib/services/stay/id-proof.service';

export const dynamic = 'force-dynamic';

/** GET: a short-lived link to the current guest's ID photo. The photo itself never leaves the private bucket. */
export const GET = withApiErrorBoundary(async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;
    const { id } = await params;

    const { data: room, error } = await supabase.from('rooms').select('id, id_proof_path, id_verified_at, checkin_source')
      .eq('id', id).eq('business_id', businessId).maybeSingle();
    if (error) throw error;
    if (!room) return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });
    if (!room.id_proof_path) return NextResponse.json({ success: true, url: null, verified_at: room.id_verified_at, checkin_source: room.checkin_source });

    const url = await signedIdProofUrl(adminDb(), room.id_proof_path);
    return NextResponse.json(
      { success: true, url, expires_in: ID_PROOF_URL_SECONDS, verified_at: room.id_verified_at, checkin_source: room.checkin_source },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return handleApiError(error, request, 'HostRoomIdProofGET');
  }
}, 'HostRoomIdProofGET');

/** PATCH { action: 'verify' }: the desk has looked at the ID and the guest. */
export const PATCH = withApiErrorBoundary(async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    if (body?.action !== 'verify') return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });

    const { data, error } = await supabase.from('rooms').update({ id_verified_at: new Date().toISOString() })
      .eq('id', id).eq('business_id', businessId).eq('status', 'OCCUPIED').select('id, id_verified_at').maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ success: false, error: 'No guest is checked in to this room.' }, { status: 409 });
    return NextResponse.json({ success: true, verified_at: data.id_verified_at });
  } catch (error) {
    return handleApiError(error, request, 'HostRoomIdProofPATCH');
  }
}, 'HostRoomIdProofPATCH');
