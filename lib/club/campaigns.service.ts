// Acquisition QR campaigns. Each campaign is a code carried as /join?src=<code>; applications keep
// it as campaign_source. Rotating retires a code (its QR stops counting) and issues a fresh one.
import { randomBytes } from 'node:crypto';
import { fail, must } from './http';
import { cleanText } from './identity/identity-rules';

const slug = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 28) || 'qr';
const newCode = (label: string) => `${slug(label)}-${randomBytes(3).toString('hex')}`;

export async function createCampaign(db: any, staffId: string, rawLabel: unknown, rotatedFrom: string | null = null) {
  const label = cleanText(rawLabel, 80);
  if (!label) fail(400, 'Name the campaign, for example "Goa hostel posters".');
  return must(await db.from('club_campaigns').insert({ code: newCode(label), label, active: true, created_by: staffId, rotated_from: rotatedFrom })
    .select('id, code, label, active, rotated_from, created_at').single());
}

export async function rotateCampaign(db: any, staffId: string, id: string) {
  const rows = must(await db.from('club_campaigns').update({ active: false }).eq('id', id).eq('active', true).select('id, label')) as any[];
  if (rows.length === 0) fail(409, 'Only an active campaign can be rotated.');
  return createCampaign(db, staffId, rows[0].label, rows[0].id);
}

export async function setCampaignActive(db: any, id: string, active: boolean) {
  const rows = must(await db.from('club_campaigns').update({ active }).eq('id', id).select('id')) as any[];
  if (rows.length === 0) fail(404, 'Campaign not found.');
}

/** Campaigns with how many applications each brought in. */
export async function listCampaigns(db: any) {
  const campaigns = must(await db.from('club_campaigns').select('id, code, label, active, rotated_from, created_at').order('created_at', { ascending: false }).limit(200)) as any[];
  if (campaigns.length === 0) return [];
  const sources = must(await db.from('viber_profiles').select('campaign_source').in('campaign_source', campaigns.map((c) => c.code))) as any[];
  const counts = new Map<string, number>();
  sources.forEach((s) => counts.set(s.campaign_source, (counts.get(s.campaign_source) ?? 0) + 1));
  return campaigns.map((c) => ({ ...c, applications: counts.get(c.code) ?? 0 }));
}

/** An active campaign code, or null (an unknown or retired code is simply not counted). */
export async function activeCampaign(db: any, code: string): Promise<string | null> {
  if (!/^[a-z0-9_-]{3,40}$/.test(code)) return null;
  const row = must(await db.from('club_campaigns').select('code').eq('code', code).eq('active', true).maybeSingle()) as any;
  return row?.code ?? null;
}
