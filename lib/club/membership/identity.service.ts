// One identity across QC and Club: the Viber ID is the person's Vibers @handle. Someone who already
// has a Vibers account (as a QC guest) keeps their handle; anyone else gets one made through the same
// service QC uses, so the same handle rules (and old wallet protections) apply everywhere.
import { createVibersProfile, getVibersAccount } from '@/lib/services/guest-auth/vibers-profile.service';
import { checkViberId } from '../identity/identity-rules';
import { fail } from '../http';

export interface IdentityInput { rawViberId: unknown; displayName: string; phone: string; legacyPin?: unknown }

export async function ensureVibersIdentity(db: any, userId: string, input: IdentityInput): Promise<string> {
  const account = await getVibersAccount(db, userId);
  if (account) return account.handle;

  const id = checkViberId(input.rawViberId);
  if (!id.ok) fail(400, id.error, 'viber_id_invalid');
  const created = await createVibersProfile(db, {
    userId, rawHandle: id.viberId, rawName: input.displayName, rawPhone: input.phone, legacyPin: input.legacyPin, walletSecret: null,
  });
  if (!created.ok) {
    const taken = created.code === 'handle_taken';
    // An old @handle + PIN guest account asks for its PIN; that is a form step, not a signed-out 401.
    const status = created.code === 'legacy_pin_required' ? 409 : created.status;
    fail(status, taken ? 'That Viber ID is taken. Please choose another.' : created.error, created.code);
  }
  return created.profile.handle;
}

/** The handle this person already has, so the form can show it instead of asking for one. */
export async function existingViberId(db: any, userId: string): Promise<string | null> {
  return (await getVibersAccount(db, userId))?.handle ?? null;
}
