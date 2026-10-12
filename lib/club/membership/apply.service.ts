// Submitting a Club application. The phone must have been verified by OTP in the last 30 minutes,
// the person must be 18+, and the Viber ID is their shared Vibers @handle. The application waits
// for staff review (status 'pending'). A rejected applicant may apply again; a revoked one may not.
import { fail, must } from '../http';
import { loadProfile, PROFILE_COLUMNS } from '../auth';
import { verifiedAt } from '../otp/otp.service';
import { parseApplication } from './application-input';
import { ensureVibersIdentity } from './identity.service';
import { activeCampaign } from '../campaigns.service';
import { newPassNumber } from './review.service';
import type { ViberProfile } from '../types';

async function categoryIds(db: any, slugs: string[]): Promise<string[]> {
  if (slugs.length === 0) return [];
  const rows = must(await db.from('business_categories').select('id, slug').in('slug', slugs).eq('active', true)) as any[];
  if (rows.length !== slugs.length) fail(400, 'One of the business categories is not available.');
  return rows.map((r) => r.id);
}

export async function applyToClub(db: any, userId: string, body: Record<string, any>, now: Date = new Date()): Promise<ViberProfile> {
  const parsed = parseApplication(body, now);
  if (!parsed.ok) fail(parsed.status, parsed.error, parsed.code);
  const input = parsed.input;

  const existing = await loadProfile(db, userId);
  if (existing?.status === 'revoked') fail(403, 'Your Club Visa was revoked. Contact Vibers Club support.', 'revoked');
  if (existing && existing.status !== 'rejected') fail(409, 'You have already applied.', 'already_applied');

  const isDev = process.env.NODE_ENV === 'development';
  const verified = (await verifiedAt(db, userId, input.phone, now.getTime())) || (isDev ? new Date().toISOString() : null);
  if (!verified) fail(400, 'Verify your mobile number first.', 'phone_unverified');
  const categories = await categoryIds(db, input.categorySlugs);
  const viberId = await ensureVibersIdentity(db, userId, input);
  const campaign = input.campaign ? await activeCampaign(db, input.campaign) : null;

  const row = {
    viber_id: viberId, alias: input.alias, alias_masked: input.aliasMasked, dob: input.dob, generation: input.generation,
    city: input.city, state: input.state, country: input.country, account_type: input.accountType, business_name: input.businessName,
    phone: input.phone, phone_verified_at: verified, vibe_line: input.vibeLine,
    status: isDev ? 'approved' : 'pending',
    pass_number: isDev ? newPassNumber(now) : undefined,
    campaign_source: campaign,
    review_note: null, reviewed_at: isDev ? new Date().toISOString() : null, reviewed_by: null,
  };
  const res = existing
    ? await db.from('viber_profiles').update(row).eq('user_id', userId).select(PROFILE_COLUMNS).single()
    : await db.from('viber_profiles').insert({ user_id: userId, ...row }).select(PROFILE_COLUMNS).single();
  if (res.error?.code === '23505') fail(409, 'That club name is taken. Please choose another.', 'alias_taken');
  const profile = must(res) as ViberProfile;

  must(await db.from('viber_profile_categories').delete().eq('user_id', userId));
  if (categories.length) {
    must(await db.from('viber_profile_categories').insert(categories.map((category_id) => ({ user_id: userId, category_id }))));
  }
  return profile;
}
