import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';

const ctx = vi.hoisted(() => ({ db: null as any }));
vi.mock('@/lib/supabase/admin', () => ({ adminDb: () => ctx.db, getAdminClient: () => ctx.db }));

import { GET, POST, PATCH } from '@/app/api/guest/lobby/route';

const VENUE_A = 'aaaaaaaa-1111-4222-8333-444444444444';
const VENUE_B = 'bbbbbbbb-1111-4222-8333-444444444444';

const url = (venue: string | null, q = '') => `http://localhost/api/guest/lobby?${venue ? `cafe_id=${venue}&` : ''}${q}`;
const post = (venue: string | null, q: string, body: unknown) =>
  POST(new Request(url(venue, q), { method: 'POST', body: JSON.stringify(body) }));
const patch = (venue: string, body: unknown) => PATCH(new Request(url(venue), { method: 'PATCH', body: JSON.stringify(body) }));
const get = (venue: string | null, q: string) => GET(new Request(url(venue, q)));

const invite = { sender_session_id: 'sess-A', sender_name: 'Asha', sender_table: 'T-01', receiver_table: 'T-02', interaction_type: 'coffee' };

describe('Social lobby (venue-scoped, membership-checked)', () => {
  beforeEach(() => {
    ctx.db = createFakeSupabase({
      businesses: [
        { id: VENUE_A, business_name: 'Venue A' },
        { id: VENUE_B, business_name: 'Venue B' },
      ],
      lobby_messages: [],
      table_invitations: [],
      private_chats: [],
      private_chat_messages: [],
    });
  });

  it('requires a venue', async () => {
    expect((await get(null, 'type=messages')).status).toBe(400);
    expect((await post(null, 'type=messages', { guest_name: 'x', content: 'hi' })).status).toBe(400);
  });

  it('messages posted at one venue are invisible at another', async () => {
    await post(VENUE_A, 'type=messages', { guest_name: 'Asha', content: 'hello A', session_id: 's1', table_number: 'T-01' });
    await post(VENUE_B, 'type=messages', { guest_name: 'Ravi', content: 'hello B', session_id: 's2', table_number: 'T-05' });

    const a = (await (await get(VENUE_A, 'type=messages')).json()).messages;
    const b = (await (await get(VENUE_B, 'type=messages')).json()).messages;

    expect(a.map((m: any) => m.content)).toEqual(['hello A']);
    expect(b.map((m: any) => m.content)).toEqual(['hello B']);
  });

  it('validates and bounds what a guest can post', async () => {
    expect((await post(VENUE_A, 'type=messages', { guest_name: 'Asha', content: '   ' })).status).toBe(400);
    await post(VENUE_A, 'type=messages', { guest_name: 'Asha', content: 'x'.repeat(5000) });
    expect(ctx.db.tables.lobby_messages[0].content).toHaveLength(500);
  });

  it('a database failure is reported, not hidden behind a per-instance memory copy', async () => {
    ctx.db = createFakeSupabase(
      { businesses: [{ id: VENUE_A, business_name: 'Venue A' }], lobby_messages: [] },
      { failOn: { 'lobby_messages.insert': () => true } }
    );
    const res = await post(VENUE_A, 'type=messages', { guest_name: 'Asha', content: 'hi' });
    expect(res.status).toBe(500);
    expect(ctx.db.tables.lobby_messages).toHaveLength(0);
  });

  it('only the invited table can accept an invitation, and accepting creates a real chat once', async () => {
    const created = await (await post(VENUE_A, '', invite)).json();
    const id = created.invitation.id;
    expect(created.invitation).toMatchObject({ business_id: VENUE_A, status: 'pending' });

    // wrong table, wrong venue
    expect((await patch(VENUE_A, { invitation_id: id, status: 'accepted', receiver_table: 'T-09' })).status).toBe(404);
    expect((await patch(VENUE_B, { invitation_id: id, status: 'accepted', receiver_table: 'T-02' })).status).toBe(404);
    expect(ctx.db.tables.private_chats).toHaveLength(0);

    const ok = await patch(VENUE_A, { invitation_id: id, status: 'accepted', receiver_table: 'T-02', receiver_session_id: 'sess-B' });
    const okBody = await ok.json();
    expect(ok.status).toBe(200);
    expect(okBody.chat_id).toBe(ctx.db.tables.private_chats[0].id);
    expect(ctx.db.tables.private_chats[0]).toMatchObject({ business_id: VENUE_A, session_a: 'sess-A', session_b: 'sess-B' });
    expect(ctx.db.tables.table_invitations[0].status).toBe('accepted');

    // already answered
    expect((await patch(VENUE_A, { invitation_id: id, status: 'declined', receiver_table: 'T-02' })).status).toBe(404);
  });

  it('chat messages are restricted to the two participants of a venue-owned chat', async () => {
    const id = (await (await post(VENUE_A, '', invite)).json()).invitation.id;
    const chatId = (await (await patch(VENUE_A, { invitation_id: id, status: 'accepted', receiver_table: 'T-02', receiver_session_id: 'sess-B' })).json()).chat_id;

    const stranger = await post(VENUE_A, 'type=chat', { chat_id: chatId, sender_session_id: 'sess-X', message: 'psst' });
    expect(stranger.status).toBe(404);

    const otherVenue = await post(VENUE_B, 'type=chat', { chat_id: chatId, sender_session_id: 'sess-A', message: 'psst' });
    expect(otherVenue.status).toBe(404);

    const member = await post(VENUE_A, 'type=chat', { chat_id: chatId, sender_session_id: 'sess-A', sender_name: 'Asha', message: 'hi there' });
    expect(member.status).toBe(200);

    // reading needs membership too
    expect((await get(VENUE_A, `type=chat&chat_id=${chatId}&session_id=sess-X`)).status).toBe(404);
    const read = await (await get(VENUE_A, `type=chat&chat_id=${chatId}&session_id=sess-B`)).json();
    expect(read.messages.map((m: any) => m.message)).toEqual(['hi there']);
  });

  it('relay-only chats and invitations (client-made ids) are acknowledged without persisting', async () => {
    const chat = await (await post(VENUE_A, 'type=chat', { chat_id: 'chat-12345', sender_session_id: 's', message: 'hi' })).json();
    expect(chat).toMatchObject({ success: true, persisted: false });

    const answer = await (await patch(VENUE_A, { invitation_id: 'inv-12345', status: 'accepted' })).json();
    expect(answer).toMatchObject({ success: true, persisted: false });
  });
});
