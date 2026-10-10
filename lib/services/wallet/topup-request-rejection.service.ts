import { memTopupRequests } from './wallet-memory.store';
import { adminDb } from '@/lib/supabase/admin';

export async function rejectTopupRequest(
  supabase: any,
  requestId: string,
  reason: string = 'Payment verification failed',
  reviewedBy: string = 'admin'
) {
  const db = adminDb();

  const { data: req, error: readErr } = await db
    .from('venue_topup_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!req) throw new Error(`Top-up request ${requestId} not found`);
  if (req.status !== 'pending') {
    throw new Error(`Top-up request is already ${req.status}`);
  }

  const nowIso = new Date().toISOString();

  // Conditioned on status='pending' so a concurrent approve/reject can't both
  // "succeed" against the same request (last-write-wins on a bare .eq(id) update).
  const { data: updated, error: updateErr } = await db
    .from('venue_topup_requests')
    .update({
      status: 'rejected',
      notes: reason,
      reviewed_by: reviewedBy,
      reviewed_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select()
    .maybeSingle();
  if (updateErr) throw updateErr;
  if (!updated) {
    throw new Error('Top-up request was concurrently approved or rejected by another request');
  }

  const memIdx = memTopupRequests.findIndex((r) => r.id === requestId);
  if (memIdx !== -1) {
    memTopupRequests[memIdx].status = 'rejected';
    memTopupRequests[memIdx].notes = reason;
    memTopupRequests[memIdx].reviewed_by = reviewedBy;
    memTopupRequests[memIdx].reviewed_at = nowIso;
    memTopupRequests[memIdx].updated_at = nowIso;
  }

  return {
    success: true,
    message: 'Top-up request rejected.',
    request: { ...req, status: 'rejected', notes: reason, reviewed_by: reviewedBy, reviewed_at: nowIso },
  };
}
