import { memTopupRequests } from './wallet-memory.store';
import { adminDb } from '@/lib/supabase/admin';

/**
 * Approves a venue top-up request and credits the wallet via the
 * `approve_topup_request` RPC (supabase/migrations/20261006000003), which is
 * row-locked and idempotent (re-approving an already-approved request is a
 * safe no-op, returned with `idempotent: true`).
 *
 * There is intentionally no non-atomic fallback here anymore: the previous
 * fallback re-implemented the same credit+status-update without a row lock,
 * so a network blip on the RPC call (which may have already committed) could
 * double-credit the wallet on retry. A fully-failed RPC is a real failure
 * that must be retried, not silently papered over with an unsafe shortcut.
 */
export async function approveTopupRequest(
  supabase: any,
  requestId: string,
  reviewedBy: string = 'admin'
) {
  const db = supabase || adminDb();

  const { data: rpcRes, error: rpcErr } = await db.rpc('approve_topup_request', {
    p_request_id: requestId,
    p_admin_id: reviewedBy,
  });

  if (rpcErr) throw rpcErr;
  if (!rpcRes?.success) {
    const err: any = new Error(rpcRes?.error || 'Failed to approve top-up request');
    err.status = 409;
    throw err;
  }

  // Synchronize in-memory cache if present (best-effort UI nicety only).
  const memIdx = memTopupRequests.findIndex((r) => r.id === requestId);
  if (memIdx !== -1) {
    memTopupRequests[memIdx].status = 'approved';
    memTopupRequests[memIdx].reviewed_by = reviewedBy;
    memTopupRequests[memIdx].reviewed_at = new Date().toISOString();
  }

  return {
    success: true,
    message: rpcRes.idempotent
      ? 'Top-up request was already approved.'
      : 'Top-up approved and wallet credited successfully via atomic RPC.',
    ...rpcRes,
  };
}
