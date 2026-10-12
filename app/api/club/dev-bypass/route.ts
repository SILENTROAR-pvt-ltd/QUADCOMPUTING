import { adminDb } from '@/lib/supabase/admin';
import { clubApi, fail, ok } from '@/lib/club/http';
import { sessionUser } from '@/lib/club/auth';
import { newPassNumber } from '@/lib/club/membership/review.service';

export const dynamic = 'force-dynamic';

/** POST /api/club/dev-bypass — for local development: immediately issues an approved Club Visa for the current user. */
export const POST = clubApi('DevBypass', async () => {
  if (process.env.NODE_ENV === 'production') {
    fail(403, 'Dev bypass is only available in development.');
  }

  const db = adminDb();
  let user = await sessionUser();

  // If session is missing in cookie, fallback to recent dev user
  if (!user) {
    const { data: users } = await db.auth.admin.listUsers();
    user = (users?.users?.[0] as any) ?? null;
  }

  if (!user) {
    fail(400, 'No user found. Please sign in first.');
  }

  const email = user.email || 'dev_member';
  const rawPrefix = email.split('@')[0].replace(/[^a-z0-9_]/gi, '').toLowerCase();
  const handle = `@${(rawPrefix.slice(0, 28) || 'viber')}`;
  const phone = '919056660986';

  // 1. Ensure vibers_accounts row exists
  await db.from('vibers_accounts').upsert({
    user_id: user.id,
    handle,
    display_name: email.split('@')[0],
    phone,
    avatar: '☕',
    traveller_type: 'foodie',
    intro: 'Local dev member',
  }, { onConflict: 'user_id' });

  // 2. Mark phone verified in club_phone_otps
  await db.from('club_phone_otps').upsert({
    user_id: user.id,
    phone,
    code_hash: 'dev_bypass_hash',
    attempts: 0,
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    consumed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });

  // 3. Upsert approved viber_profiles
  const { data: profile, error } = await db.from('viber_profiles').upsert({
    user_id: user.id,
    viber_id: handle,
    alias: email.split('@')[0],
    alias_masked: false,
    dob: '1995-01-01',
    generation: 'millennial',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    account_type: 'viber',
    phone,
    phone_verified_at: new Date().toISOString(),
    vibe_line: 'Local dev member',
    status: 'approved',
    pass_number: newPassNumber(),
  }, { onConflict: 'user_id' }).select().single();

  if (error) fail(500, error.message);

  return ok({ approved: true, profile });
});
