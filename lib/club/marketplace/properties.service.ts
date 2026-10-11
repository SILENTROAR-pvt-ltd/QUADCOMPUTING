// The property marketplace. Business members list properties (optionally linked to a QC venue they
// host); staff verify them before they appear in search. Editing a verified listing sends it back
// for review.
import { fail, must } from '../http';
import { hostedVenues } from '../qc-bridge';
import { logModeration } from '../moderation/moderation-log';
import { notify } from '../notifications.service';
import { cleanText } from '../identity/identity-rules';
import { parseProperty } from './property-input';
import type { ViberProfile } from '../types';

export const PROPERTY_COLUMNS =
  'id, owner_id, business_id, name, categories, description, capacity, photo_paths, price_min, price_max, amenities, lat, lng, address, city, state, country, house_rules, terms, status, review_note, verified_at, created_at';

export async function loadProperty(db: any, id: string) {
  const p = must(await db.from('property_marketplace').select(PROPERTY_COLUMNS).eq('id', id).maybeSingle()) as any;
  if (!p) fail(404, 'Property not found.');
  return p;
}

async function validated(db: any, owner: ViberProfile, body: Record<string, any>) {
  if (owner.account_type !== 'business') fail(403, 'Only business members can list properties.');
  const parsed = parseProperty(body, owner.user_id);
  if (!parsed.ok) fail(400, parsed.error);
  const known = must(await db.from('business_categories').select('slug').in('slug', parsed.categories).eq('active', true)) as any[];
  if (known.length !== parsed.categories.length) fail(400, 'One of the categories is not available.');
  if (parsed.businessId && !(await hostedVenues(db, owner.user_id)).some((v) => v.id === parsed.businessId)) {
    fail(403, 'You can only link a QC venue you host.');
  }
  return parsed.row;
}

export async function createProperty(db: any, owner: ViberProfile, body: Record<string, any>) {
  const row = await validated(db, owner, body);
  return must(await db.from('property_marketplace').insert({ ...row, owner_id: owner.user_id, status: 'pending' }).select(PROPERTY_COLUMNS).single());
}

export async function updateProperty(db: any, owner: ViberProfile, id: string, body: Record<string, any>) {
  const current = await loadProperty(db, id);
  if (current.owner_id !== owner.user_id) fail(403, 'Only the owner can edit this listing.');
  if (current.status === 'suspended') fail(409, 'This listing is suspended. Contact Vibers Club support.');
  const row = await validated(db, owner, body);
  return must(await db.from('property_marketplace').update({ ...row, status: 'pending', updated_at: new Date().toISOString() })
    .eq('id', id).select(PROPERTY_COLUMNS).single());
}

export interface PropertySearch { city?: string | null; category?: string | null; guests?: number | null; maxRate?: number | null; amenity?: string | null }

export async function searchProperties(db: any, s: PropertySearch = {}) {
  let q = db.from('property_marketplace').select(PROPERTY_COLUMNS).eq('status', 'verified');
  if (s.city) q = q.ilike('city', `*${s.city.replace(/[*%,()]/g, '')}*`);
  if (s.guests) q = q.gte('capacity', s.guests);
  if (s.maxRate != null) q = q.lte('price_min', s.maxRate);
  const rows = must(await q.order('created_at', { ascending: false }).limit(60)) as any[];
  return rows.filter((p) => (!s.category || p.categories.includes(s.category)) && (!s.amenity || p.amenities.includes(s.amenity)));
}

export async function reviewProperty(db: any, staffId: string, id: string, decision: unknown, rawNote?: unknown) {
  if (!['verified', 'rejected', 'suspended'].includes(String(decision))) fail(400, 'Choose verified, rejected or suspended.');
  const note = cleanText(rawNote, 500);
  if (decision !== 'verified' && !note) fail(400, 'Write a short reason the owner can read.');
  const verified = decision === 'verified';
  const rows = must(await db.from('property_marketplace').update({
    status: decision, review_note: verified ? null : note, verified_by: verified ? staffId : null, verified_at: verified ? new Date().toISOString() : null,
  }).eq('id', id).select('id, owner_id, name')) as any[];
  if (rows.length === 0) fail(404, 'Property not found.');
  await logModeration(db, { actorId: staffId, action: `property_${decision}`, targetType: 'property', targetId: id, targetUserId: rows[0].owner_id, note });
  await notify(db, [rows[0].owner_id], {
    kind: 'property', title: verified ? `${rows[0].name} is verified` : `${rows[0].name}: ${decision}`, body: note, link: `/club/properties/${id}`,
  });
  return rows[0];
}
