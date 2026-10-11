// Everything the plan page shows, shaped for the person looking: members see the public plan;
// the creator also sees deals, money and the consent step; staff see everything.
import { fail, must } from '../http';
import { publicMembers } from '../membership/members';
import { signMedia } from '../media';
import { eventRoom } from '../chat/rooms.service';
import { agreementsForEvent, offersForEvent } from '../marketplace/agreements.service';
import { eventStatement } from '../ledger/reconcile.service';
import { activeConsent, canSee, loadEvent } from './events.service';
import { nextInstallment } from './participation.service';

export async function eventView(db: any, id: string, viewerId: string, staff: boolean) {
  const event = await loadEvent(db, id);
  if (!canSee(event, viewerId, staff)) fail(404, 'Plan not found.');
  const isCreator = event.creator_id === viewerId;

  const [creator] = await publicMembers(db, [event.creator_id]);
  const urls = await signMedia(db, [...event.cover_paths, creator?.avatar_url]);
  const interest = must(await db.from('club_event_interest').select('user_id').eq('event_id', id)) as any[];
  const participants = must(await db.from('club_event_participants').select('user_id, status, total_due, paid').eq('event_id', id)) as any[];
  const mine = participants.find((p) => p.user_id === viewerId) || null;
  const interested = interest.some((i) => i.user_id === viewerId);
  const inRoom = isCreator || interested || Boolean(mine) || staff;

  const rawAgreements = await agreementsForEvent(db, id);
  const props = rawAgreements.length
    ? (must(await db.from('property_marketplace').select('id, name').in('id', rawAgreements.map((a) => a.property_id))) as any[])
    : [];
  const agreements = rawAgreements.map((a) => ({ ...a, property_name: props.find((p) => p.id === a.property_id)?.name ?? 'Property' }));
  const ownsDeal = agreements.some((a) => a.owner_id === viewerId);
  const noc = must(await db.from('club_nocs').select('code').eq('event_id', id).maybeSingle()) as any;

  return {
    event: { ...event, covers: event.cover_paths.map((p) => urls.get(p)).filter(Boolean), cover_paths: isCreator ? event.cover_paths : [] },
    creator: creator ? { ...creator, avatar_url: creator.avatar_url ? urls.get(creator.avatar_url) ?? null : null } : null,
    counts: { interested: interest.length, going: participants.filter((p) => p.status !== 'cancelled').length },
    me: {
      isCreator, interested, staff,
      participant: mine,
      next: mine && mine.status !== 'cancelled' ? nextInstallment(event, Number(mine.total_due), Number(mine.paid)) : null,
    },
    roomId: inRoom && event.status === 'approved' ? (await eventRoom(db, id)).id : null,
    consent: isCreator && event.status === 'draft' ? await activeConsent(db) : null,
    offers: isCreator || staff ? await offersForEvent(db, id) : [],
    agreements: isCreator || staff ? agreements : agreements.filter((a) => a.owner_id === viewerId),
    statement: isCreator || staff ? await eventStatement(db, id) : null,
    nocCode: (isCreator || staff || ownsDeal) && noc ? noc.code : null,
  };
}
