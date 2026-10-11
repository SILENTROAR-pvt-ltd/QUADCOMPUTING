import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({}) }));

import { clubDb, member, seedMembers } from './fakes';
import { heartbeat, leave, onlineMembers, publicBubbles } from '@/lib/club/presence.service';
import { assertRoomAccess, directRoom, getRoom } from '@/lib/club/chat/rooms.service';
import { listMessages, markRead, sendMessage, toggleReaction, unreadCounts } from '@/lib/club/chat/messages.service';
import { actOnMember } from '@/lib/club/moderation/actions.service';
import { fileReport } from '@/lib/club/moderation/reports.service';

const A = '44444444-aaaa-4bbb-8ccc-00000000000a';
const B = '44444444-aaaa-4bbb-8ccc-00000000000b';
const C = '44444444-aaaa-4bbb-8ccc-00000000000c';
const STAFF = '44444444-aaaa-4bbb-8ccc-0000000000ff';
const GLOBAL = 'room-global-0001';

function db(cOver: Record<string, unknown> = {}) {
  const a = member(A, '@asha'), b = member(B, '@bilal', { generation: 'gen_z', city: 'Pune' }), c = member(C, '@chet', cOver);
  return {
    d: clubDb({
      ...seedMembers(a, b, c), club_presence: [], club_rooms: [{ id: GLOBAL, kind: 'global', slug: 'global', dm_key: null, event_id: null }],
      club_room_members: [], club_messages: [], club_message_reactions: [], club_stories: [], club_reports: [], club_moderation_log: [],
    }),
    profiles: { a: a.profile as any, b: b.profile as any, c: c.profile as any },
  };
}

describe('Live presence', () => {
  it('a heartbeat in the last 45 seconds means online; leaving removes you at once', async () => {
    const { d } = db();
    const now = new Date('2026-10-11T10:00:00Z');
    await heartbeat(d, A, new Date(now.getTime() - 30_000));
    await heartbeat(d, B, new Date(now.getTime() - 60_000));
    expect((await onlineMembers(d, C, {}, now)).map((m) => m.user_id)).toEqual([A]);
    await leave(d, A);
    expect(await onlineMembers(d, C, {}, now)).toEqual([]);
  });

  it('filters by generation, city and Viber ID', async () => {
    const { d } = db();
    const now = new Date();
    for (const id of [A, B, C]) await heartbeat(d, id, now);
    expect((await onlineMembers(d, A, { generation: 'gen_z' }, now)).map((m) => m.user_id)).toEqual([B]);
    expect((await onlineMembers(d, A, { city: 'pun' }, now)).map((m) => m.user_id)).toEqual([B]);
    expect((await onlineMembers(d, A, { q: '@chet' }, now)).map((m) => m.user_id)).toEqual([C]);
  });

  it('a shadow-banned member sees themself online; nobody else does', async () => {
    const { d } = db({ shadow_banned: true });
    const now = new Date();
    await heartbeat(d, C, now);
    expect(await onlineMembers(d, A, {}, now)).toEqual([]);
    expect((await onlineMembers(d, C, {}, now)).map((m) => m.user_id)).toEqual([C]);
  });

  it('the public landing shows first names or club names only', async () => {
    const { d } = db({ alias: 'Night Owl', alias_masked: true });
    const now = new Date();
    await heartbeat(d, A, now);
    await heartbeat(d, C, now);
    const bubbles = await publicBubbles(d, now);
    expect(bubbles.map((b) => b.name).sort()).toEqual(['Asha', 'Night']);
    expect(JSON.stringify(bubbles)).not.toContain('@');
  });
});

describe('Club chat', () => {
  it('stars out profanity, and keeps a shadow-banned sender\'s messages to themselves', async () => {
    const { d, profiles } = db({ shadow_banned: true });
    await sendMessage(d, GLOBAL, profiles.a, { body: 'what the fuck, sunset at 6?' });
    await sendMessage(d, GLOBAL, profiles.c, { body: 'spam spam' });
    const seenByB = await listMessages(d, GLOBAL, B);
    expect(seenByB.messages.map((m) => m.body)).toEqual(['what the f***, sunset at 6?']);
    expect((await listMessages(d, GLOBAL, C)).messages).toHaveLength(2);
    expect((await listMessages(d, GLOBAL, B, { staff: true })).messages).toHaveLength(2);
  });

  it('refuses an image that is not the sender\'s own upload', async () => {
    const { d, profiles } = db();
    await expect(sendMessage(d, GLOBAL, profiles.a, { image_path: `chat/${B}/x.jpg` })).rejects.toMatchObject({ status: 400 });
  });

  it('counts unread messages since you last read, and reactions are per person', async () => {
    const { d, profiles } = db();
    await markRead(d, GLOBAL, B, new Date(Date.now() - 60_000));
    const msg: any = await sendMessage(d, GLOBAL, profiles.a, { body: 'hi all' });
    expect(await unreadCounts(d, B)).toEqual({ [GLOBAL]: 1 });
    await markRead(d, GLOBAL, B);
    expect(await unreadCounts(d, B)).toEqual({});
    await toggleReaction(d, msg.id, B, '🔥', true);
    await toggleReaction(d, msg.id, B, '🔥', true);
    const [m] = (await listMessages(d, GLOBAL, B)).messages;
    expect(m.reactions).toEqual([{ emoji: '🔥', count: 1, mine: true }]);
    await expect(toggleReaction(d, msg.id, B, '💩', true)).rejects.toMatchObject({ status: 400 });
  });

  it('a direct-message room is made once, and only its two members can read it', async () => {
    const { d } = db();
    const first = await directRoom(d, A, B);
    const again = await directRoom(d, B, A);
    expect(again.id).toBe(first.id);
    await expect(assertRoomAccess(d, await getRoom(d, first.id), C)).rejects.toMatchObject({ code: 'not_in_room' });
    await assertRoomAccess(d, first, A);
    await expect(directRoom(d, A, A)).rejects.toMatchObject({ status: 400 });
  });
});

describe('Red Flag Protocol actions', () => {
  it('reporting the same thing twice is harmless', async () => {
    const { d } = db();
    expect(await fileReport(d, A, { target_type: 'user', target_id: B, reason: 'rude in chat' })).toEqual({ duplicate: false });
    expect(await fileReport(d, A, { target_type: 'user', target_id: B, reason: 'again' })).toEqual({ duplicate: true });
    await expect(fileReport(d, A, { target_type: 'user', target_id: A, reason: 'me' })).rejects.toMatchObject({ status: 400 });
  });

  it('mute sets a time limit; revoking a pass takes the member offline; every action is logged', async () => {
    const { d } = db();
    const now = new Date('2026-10-11T10:00:00Z');
    const muted = await actOnMember(d, STAFF, B, { action: 'mute', minutes: 30 }, now);
    expect(muted.muted_until).toBe('2026-10-11T10:30:00.000Z');
    await heartbeat(d, B, now);
    await actOnMember(d, STAFF, B, { action: 'revoke', note: 'harassment' }, now);
    expect(d.tables.viber_profiles.find((p: any) => p.user_id === B).status).toBe('revoked');
    expect(d.tables.club_presence).toHaveLength(0);
    await expect(actOnMember(d, STAFF, B, { action: 'revoke' }, now)).rejects.toMatchObject({ status: 409 });
    expect(d.tables.club_moderation_log.map((l: any) => l.action)).toEqual(['mute', 'revoke']);
  });
});
