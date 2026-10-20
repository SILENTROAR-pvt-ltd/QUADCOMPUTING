import { NextResponse } from 'next/server';
import { hasMasterUnlock, masterUnlockFromCookieHeader } from './master-unlock';
import { isPinSet } from './venue-pin';

/**
 * Server-side master lock for an owner write. When the venue has a master PIN, the change needs the signed unlock cookie
 * (issued after a correct master PIN). The client gatekeeper alone does not stop a direct request.
 */
export function masterUnlockRequired(request: Request, auth: { user?: { id?: string } | null; businessId: string; business?: unknown }): NextResponse | null {
  if (!isPinSet(auth.business as any, 'admin')) return null;
  const token = masterUnlockFromCookieHeader(request.headers.get('cookie'));
  if (auth.user?.id && hasMasterUnlock(token, auth.user.id, auth.businessId)) return null;
  return NextResponse.json(
    { success: false, error: 'Enter the master PIN to change this section.', code: 'MASTER_UNLOCK_REQUIRED' },
    { status: 403 },
  );
}

/** The banking and payment fields an owner read returns only with the master unlock (or when no master PIN is set). */
export const MASTER_LOCKED_BUSINESS_FIELDS = ['bank_account_number', 'bank_ifsc_code', 'upi_id'] as const;
