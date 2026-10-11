// No Objection Certificates. Issued once per plan, only after it is completed and its ledger
// reconciles to zero. The certificate's contents are signed; the QR on it opens /club/noc/<code>,
// which recomputes the signature, so a printed or forwarded copy can always be checked.
import { randomBytes } from 'node:crypto';
import { fail, must } from '../http';
import { sign, verifySignature } from '../secrets';
import { notify } from '../notifications.service';
import { loadEvent } from '../events/events.service';
import { agreementsForEvent } from '../marketplace/agreements.service';
import { eventStatement } from './reconcile.service';

/** JSON with sorted keys, so the same contents always sign the same way. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as object).sort().map((k) => `${JSON.stringify(k)}:${canonical((value as any)[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export async function issueNoc(db: any, actorId: string, eventId: string, isStaff: boolean) {
  const existing = must(await db.from('club_nocs').select('code, payload, signature, issued_at').eq('event_id', eventId).maybeSingle());
  if (existing) return existing;
  const event = await loadEvent(db, eventId);
  if (!isStaff && event.creator_id !== actorId) fail(403, 'Only the plan creator or staff can request the NOC.');
  if (event.status !== 'completed') fail(409, 'Mark the plan completed first.');
  const statement = await eventStatement(db, eventId);
  if (!statement.reconciled) fail(409, 'The plan\'s ledger has not settled to zero yet.', 'not_reconciled');
  if (statement.pendingPayouts > 0) fail(409, 'Some payouts are still pending.', 'pending_payouts');

  const creator = must(await db.from('viber_profiles').select('viber_id').eq('user_id', event.creator_id).single()) as any;
  const agreements = (await agreementsForEvent(db, eventId)).filter((a) => a.status === 'deposit_paid');
  const properties = agreements.length
    ? (must(await db.from('property_marketplace').select('id, name, owner_id').in('id', agreements.map((a) => a.property_id))) as any[])
    : [];
  const code = randomBytes(8).toString('hex');
  const payload = {
    code, event_id: eventId, title: event.title, creator: creator.viber_id, starts_at: event.starts_at, ends_at: event.ends_at,
    properties: properties.map((p) => p.name).sort(), collected: statement.collected, fees: statement.fees, paid_out: statement.paidOut,
    issued_at: new Date().toISOString(),
  };
  const res = await db.from('club_nocs').insert({ event_id: eventId, code, payload, signature: sign('club-noc', canonical(payload)) })
    .select('code, payload, signature, issued_at').single();
  if (res.error?.code === '23505') return must(await db.from('club_nocs').select('code, payload, signature, issued_at').eq('event_id', eventId).single());
  const noc = must(res);
  await notify(db, [event.creator_id, ...properties.map((p) => p.owner_id)], {
    kind: 'noc', title: `NOC issued: ${event.title}`, body: 'The plan is settled. Your certificate is ready.', link: `/club/noc/${code}`,
  });
  return noc;
}

export async function verifyNoc(db: any, code: string) {
  if (!/^[0-9a-f]{16}$/.test(code)) return { valid: false as const, payload: null };
  const row = must(await db.from('club_nocs').select('payload, signature, issued_at').eq('code', code).maybeSingle()) as any;
  if (!row) return { valid: false as const, payload: null };
  return { valid: verifySignature('club-noc', canonical(row.payload), row.signature), payload: row.payload };
}
