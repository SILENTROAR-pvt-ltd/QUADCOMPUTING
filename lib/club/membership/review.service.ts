// Staff review of applications. Approval issues the Viber Pass (a unique pass number); rejection
// needs a reason the applicant can read. Every decision is written to the moderation log.
import { randomInt } from 'node:crypto';
import { fail, must } from '../http';
import { loadProfile, PROFILE_COLUMNS } from '../auth';
import { notify } from '../notifications.service';
import { logModeration } from '../moderation/moderation-log';
import { cleanText } from '../identity/identity-rules';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function newPassNumber(now: Date = new Date()): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += ALPHABET[randomInt(0, ALPHABET.length)];
  return `VC-${now.getUTCFullYear()}-${code}`;
}

export async function listApplications(db: any, status = 'pending', limit = 50) {
  return must(await db.from('viber_profiles').select(PROFILE_COLUMNS).eq('status', status)
    .order('created_at', { ascending: true }).limit(limit)) as any[];
}

export async function approveApplication(db: any, staffId: string, userId: string) {
  const profile = await loadProfile(db, userId);
  if (!profile) fail(404, 'Application not found.');
  if (profile.status !== 'pending') fail(409, `This application is already ${profile.status}.`);

  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await db.from('viber_profiles').update({
      status: 'approved', pass_number: profile.pass_number || newPassNumber(), reviewed_by: staffId,
      reviewed_at: new Date().toISOString(), review_note: null,
    }).eq('user_id', userId).eq('status', 'pending').select(PROFILE_COLUMNS);
    if (res.error?.code === '23505') continue;
    const rows = must(res) as any[];
    if (rows.length === 0) fail(409, 'This application was just reviewed by someone else.');
    await logModeration(db, { actorId: staffId, action: 'approve_application', targetUserId: userId });
    await notify(db, [userId], { kind: 'membership', title: 'Welcome to Vibers Club', body: 'Your Viber Pass is ready.', link: '/club/pass' });
    return rows[0];
  }
  fail(500, 'Could not issue a pass number. Please try again.');
}

export async function rejectApplication(db: any, staffId: string, userId: string, rawNote: unknown) {
  const note = cleanText(rawNote, 500);
  if (!note) fail(400, 'Write a short reason the applicant can read.');
  const rows = must(await db.from('viber_profiles').update({
    status: 'rejected', reviewed_by: staffId, reviewed_at: new Date().toISOString(), review_note: note,
  }).eq('user_id', userId).eq('status', 'pending').select('user_id')) as any[];
  if (rows.length === 0) fail(409, 'Only pending applications can be rejected.');
  await logModeration(db, { actorId: staffId, action: 'reject_application', targetUserId: userId, note });
  await notify(db, [userId], { kind: 'membership', title: 'Your Vibers Club application', body: note, link: '/club/apply' });
  return rows[0];
}
