// The report queue of the Red Flag Protocol. Reporting the same thing twice is a no-op.
import { fail, must } from '../http';
import { cleanText } from '../identity/identity-rules';
import { logModeration } from './moderation-log';

export const REPORT_TARGETS = ['user', 'message', 'story', 'event', 'property'] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];

export async function fileReport(db: any, reporterId: string, body: Record<string, any>) {
  const targetType = String(body.target_type || '') as ReportTarget;
  if (!REPORT_TARGETS.includes(targetType)) fail(400, 'Choose what you are reporting.');
  const targetId = String(body.target_id || '').slice(0, 64);
  if (!/^[A-Za-z0-9-]{8,64}$/.test(targetId)) fail(400, 'That item cannot be reported.');
  const reason = cleanText(body.reason, 500);
  if (!reason || reason.length < 3) fail(400, 'Tell us briefly what is wrong.');
  if (targetType === 'user' && targetId === reporterId) fail(400, 'You cannot report yourself.');

  const res = await db.from('club_reports').insert({ reporter_id: reporterId, target_type: targetType, target_id: targetId, reason, status: 'open' });
  if (res.error?.code === '23505') return { duplicate: true };
  must(res);
  return { duplicate: false };
}

export async function listReports(db: any, status = 'open', limit = 100) {
  return must(await db.from('club_reports').select('id, reporter_id, target_type, target_id, reason, status, handled_by, handled_at, created_at')
    .eq('status', status).order('created_at', { ascending: true }).limit(limit)) as any[];
}

export async function resolveReport(db: any, staffId: string, reportId: string, outcome: unknown, rawNote?: unknown) {
  if (outcome !== 'actioned' && outcome !== 'dismissed') fail(400, 'Choose actioned or dismissed.');
  const rows = must(await db.from('club_reports').update({ status: outcome, handled_by: staffId, handled_at: new Date().toISOString() })
    .eq('id', reportId).eq('status', 'open').select('id, target_type, target_id')) as any[];
  if (rows.length === 0) fail(409, 'This report is already closed.');
  await logModeration(db, {
    actorId: staffId, action: `report_${outcome}`, targetType: rows[0].target_type, targetId: rows[0].target_id, note: cleanText(rawNote, 500),
  });
  return rows[0];
}
