import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { resolveBusinessId } from '@/lib/services/guest-order/business-resolver.service';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const TABLE_REGEX = /^[A-Za-z0-9 -]{1,12}$/;

export interface ValidatedGuestContext {
  businessId: string;
  tableNumber?: string;
  error?: null;
}

export interface ValidatedGuestError {
  error: NextResponse;
  businessId?: null;
  tableNumber?: null;
}

export type ValidatedGuestResult = ValidatedGuestContext | ValidatedGuestError;

/**
 * Validates that cafe_id / business_id is a valid UUID that exists in businesses table.
 * If tableNumber is provided, validates that it matches /^[A-Za-z0-9 -]{1,12}$/.
 * Never defaults cafe_id; never derives from body when query cafe_id is present.
 */
export async function validateGuestAccess(
  rawCafeId: string | null | undefined,
  rawTableNumber?: string | null | undefined
): Promise<ValidatedGuestResult> {
  const resolution = await resolveBusinessId(rawCafeId);
  if (!resolution.success) {
    return { error: resolution.error };
  }

  const bizId = resolution.businessId;

  if (rawTableNumber !== undefined && rawTableNumber !== null) {
    const tableNumber = String(rawTableNumber).trim();
    if (!TABLE_REGEX.test(tableNumber)) {
      return {
        error: NextResponse.json(
          { error: 'Invalid table format. Must be 1-12 alphanumeric characters, spaces, or hyphens.' },
          { status: 400 }
        ),
      };
    }
    return {
      businessId: bizId,
      tableNumber,
      error: null,
    };
  }

  return {
    businessId: bizId,
    error: null,
  };
}
