import { adminDb } from '@/lib/supabase/admin';
import { clubApi, fail, idParam, must, ok, readBody } from '@/lib/club/http';
import { requireMember, staffRole } from '@/lib/club/auth';
import { loadOffer, respondToOffer } from '@/lib/club/marketplace/offers.service';
import { agreementForOffer, offerThread } from '@/lib/club/marketplace/agreements.service';
import { publicMembers } from '@/lib/club/membership/members';

export const dynamic = 'force-dynamic';

/** GET /api/club/offers/:id — the negotiation thread, current terms and any locked agreement. */
export const GET = clubApi('Offer', async (_request, ctx) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  const offer = await loadOffer(db, await idParam(ctx));
  const party = user.id === offer.creator_id || user.id === offer.owner_id;
  if (!party && !(await staffRole(db, user))) fail(404, 'Offer not found.');
  const [thread, agreement, people, event, property] = await Promise.all([
    offerThread(db, offer.id),
    agreementForOffer(db, offer.id),
    publicMembers(db, [offer.creator_id, offer.owner_id]),
    db.from('club_events').select('id, title, starts_at, ends_at').eq('id', offer.event_id).single().then(must),
    db.from('property_marketplace').select('id, name, city, price_min, price_max').eq('id', offer.property_id).single().then(must),
  ]);
  return ok({ offer, thread, agreement, people, event, property, role: user.id === offer.creator_id ? 'creator' : user.id === offer.owner_id ? 'owner' : 'staff' });
});

/** POST /api/club/offers/:id { action: counter|accept|reject|withdraw, version, …terms, note? } */
export const POST = clubApi('RespondOffer', async (request, ctx) => {
  const db = adminDb();
  const { user } = await requireMember(db, { speak: true });
  return ok(await respondToOffer(db, user.id, await idParam(ctx), await readBody(request)));
});
