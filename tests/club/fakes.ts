// Test doubles for Club pipelines: the in-memory Supabase fake with Club's unique constraints, and a
// JavaScript twin of club_post_journal (same rules: idempotent key, balanced lines, no overdraft of
// escrow or payables).
import { randomUUID } from 'node:crypto';
import { createFakeSupabase, type FakeOptions } from '@/lib/testing/fake-supabase';

export const CLUB_UNIQUE: FakeOptions['unique'] = {
  viber_profiles: [['viber_id'], ['pass_number'], ['club_username']],
  vibers_accounts: [['handle']],
  club_ledger_accounts: [['code']],
  club_journal: [['idempotency_key']],
  club_payments: [['idempotency_key'], ['gateway_order_id']],
  club_payouts: [['idempotency_key']],
  club_reports: [['reporter_id', 'target_type', 'target_id']],
  club_room_members: [['room_id', 'user_id']],
  club_message_reactions: [['message_id', 'user_id', 'emoji']],
  club_post_likes: [['post_id', 'user_id']],
  club_places: [['slug']],
  club_place_follows: [['place_id', 'user_id']],
  club_follows: [['follower_id', 'followee_id']],
  club_story_views: [['story_id', 'viewer_id']],
  club_meetup_members: [['meetup_id', 'user_id']],
  club_event_interest: [['event_id', 'user_id']],
  club_event_consents: [['event_id', 'version']],
  club_rooms: [['slug'], ['dm_key'], ['event_id']],
  club_offers: [{ cols: ['event_id', 'property_id'], where: (r) => ['open', 'countered', 'accepted'].includes(r.status) }],
  club_agreements: [['offer_id'], ['invoice_number']],
  club_webhook_events: [['id']],
  club_nocs: [['event_id'], ['code']],
};

export function clubDb(seed: Record<string, any[]> = {}, opts: FakeOptions = {}) {
  let db: any;
  const post = (a: any) => {
    const t = db.tables;
    for (const k of ['club_journal', 'escrow_ledger', 'club_ledger_accounts']) t[k] ||= [];
    const existing = t.club_journal.find((j: any) => j.idempotency_key === a.p_key);
    if (existing) return existing.id;
    const lines = a.p_lines as Array<{ account_id: string; debit: number; credit: number }>;
    const dr = lines.reduce((s, l) => s + l.debit, 0), cr = lines.reduce((s, l) => s + l.credit, 0);
    if (lines.length < 2 || dr !== cr || dr <= 0) throw Object.assign(new Error('Unbalanced journal'), { code: '23514' });
    for (const l of lines) {
      const acc = t.club_ledger_accounts.find((x: any) => x.id === l.account_id);
      if (!acc || !['event_escrow', 'vendor_payable'].includes(acc.kind)) continue;
      const all = [...t.escrow_ledger.filter((e: any) => e.account_id === acc.id), ...lines.filter((x) => x.account_id === acc.id)];
      if (all.reduce((s: number, e: any) => s + e.credit - e.debit, 0) < 0) throw Object.assign(new Error(`Insufficient funds in ${acc.code}`), { code: '23514' });
    }
    const id = randomUUID();
    t.club_journal.push({ id, idempotency_key: a.p_key, kind: a.p_kind, event_id: a.p_event, memo: a.p_memo, created_by: a.p_actor, created_at: new Date().toISOString() });
    lines.forEach((l) => t.escrow_ledger.push({ id: randomUUID(), journal_id: id, ...l }));
    return id;
  };
  db = createFakeSupabase(seed, { unique: CLUB_UNIQUE, ...opts, rpc: { club_post_journal: post, ...(opts.rpc || {}) } });
  return db;
}

export const ADULT_DOB = '1996-05-20';

/** An approved member: a Vibers account plus its Club profile. */
export function member(userId: string, handle: string, over: Record<string, unknown> = {}) {
  return {
    account: { user_id: userId, handle, display_name: handle.slice(1).replace(/^\w/, (c) => c.toUpperCase()), phone: '919800000000', avatar: '☕' },
    profile: {
      user_id: userId, viber_id: handle, alias: null, alias_masked: false, dob: ADULT_DOB, generation: 'millennial', city: 'Goa', state: 'Goa',
      country: 'India', account_type: 'viber', business_name: null, phone: '919800000000', phone_verified_at: new Date().toISOString(),
      vibe_line: 'sunsets and chai', avatar_url: null, club_username: null, username_changed_at: null, status: 'approved', pass_number: null,
      campaign_source: null, review_note: null, reviewed_at: null, muted_until: null, shadow_banned: false, created_at: new Date().toISOString(), ...over,
    },
  };
}

export function seedMembers(...list: Array<ReturnType<typeof member>>) {
  return { vibers_accounts: list.map((m) => m.account), viber_profiles: list.map((m) => m.profile) };
}
