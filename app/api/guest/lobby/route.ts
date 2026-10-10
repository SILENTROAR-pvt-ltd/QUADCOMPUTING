import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess, UUID_REGEX, TABLE_REGEX } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';

// Every lobby read and write is scoped to ONE venue (cafe_id). Previously the tables had no venue
// column, so all venues shared one feed, any caller could read any chat by id, and a swallowed DB
// error fell back to per-instance memory arrays that other instances never saw.

const INTERACTIONS = ['coffee', 'join', 'message'];
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_REGEX.test(v);
const normTable = (t: string) => t.replace(/^(table|t-)\s*/i, '').trim().toUpperCase();

function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

async function resolveVenue(request: Request, body?: any) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('cafe_id') || searchParams.get('business_id') || body?.cafe_id || body?.business_id;
  return validateGuestAccess(raw);
}

export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'messages';

    const venue = await resolveVenue(request);
    if (venue.error) return venue.error;
    const businessId = venue.businessId;

    const limited = await enforceRateLimit(request, 'guest_lobby_get', 600, 60_000, businessId);
    if (limited) return limited;

    const db = adminDb();

    if (type === 'messages') {
      const { data, error } = await db
        .from('lobby_messages')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return NextResponse.json({ success: true, messages: data || [] });
    }

    if (type === 'chat') {
      const chatId = searchParams.get('chat_id');
      const sessionId = searchParams.get('session_id');
      if (!isUuid(chatId) || !sessionId) return fail('Missing chat_id or session_id', 400);

      const { data: chat, error: chatErr } = await db
        .from('private_chats')
        .select('id, session_a, session_b')
        .eq('id', chatId)
        .eq('business_id', businessId)
        .maybeSingle();
      if (chatErr) throw chatErr;
      // Not a participant looks the same as "no such chat".
      if (!chat || (chat.session_a !== sessionId && chat.session_b !== sessionId)) return fail('Chat not found', 404);

      const { data, error } = await db
        .from('private_chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      return NextResponse.json({ success: true, messages: data || [] });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Guest Lobby GET]', error);
    return fail('Could not load the lobby. Please retry.', 500);
  }
}, 'GuestLobbyGET');

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'invite';
    const body = await request.json().catch(() => ({}));

    const venue = await resolveVenue(request, body);
    if (venue.error) return venue.error;
    const businessId = venue.businessId;

    const limited = await enforceRateLimit(request, 'guest_lobby_post', 240, 60_000, businessId);
    if (limited) return limited;

    const db = adminDb();

    // 1. Public lounge message
    if (type === 'messages') {
      const guestName = str(body.guest_name, 60);
      const content = str(body.content, 500);
      if (!content || !guestName) return fail('Missing content or guest_name', 400);

      const table = str(body.table_number, 12);
      const { data, error } = await db
        .from('lobby_messages')
        .insert({
          business_id: businessId,
          session_id: str(body.session_id, 80) || 'anon',
          guest_name: guestName,
          avatar: str(body.avatar, 8) || '☕',
          table_number: TABLE_REGEX.test(table) ? table : 'Lobby',
          content,
        })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, message: data });
    }

    // 2. Private chat message. Only participants of a real, venue-owned chat may post.
    if (type === 'chat') {
      const message = str(body.message, 500);
      if (!body.chat_id || !message) return fail('Missing chat_id or message', 400);

      // Chats that were only ever relayed over realtime have a client-made id; nothing to persist.
      if (!isUuid(body.chat_id)) return NextResponse.json({ success: true, persisted: false });

      const senderSession = str(body.sender_session_id, 80);
      const { data: chat, error: chatErr } = await db
        .from('private_chats')
        .select('id, session_a, session_b')
        .eq('id', body.chat_id)
        .eq('business_id', businessId)
        .maybeSingle();
      if (chatErr) throw chatErr;
      if (!chat || (chat.session_a !== senderSession && chat.session_b !== senderSession)) return fail('Chat not found', 404);

      const { data, error } = await db
        .from('private_chat_messages')
        .insert({
          chat_id: chat.id,
          sender_session_id: senderSession,
          sender_name: str(body.sender_name, 60) || 'Guest',
          message,
        })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, message: data });
    }

    // 3. Table invitation
    const senderTable = str(body.sender_table, 12);
    const receiverTable = str(body.receiver_table, 12);
    if (!TABLE_REGEX.test(senderTable) || !TABLE_REGEX.test(receiverTable) || !INTERACTIONS.includes(body.interaction_type)) {
      return fail('Missing or invalid invitation fields', 400);
    }

    const { data, error } = await db
      .from('table_invitations')
      .insert({
        business_id: businessId,
        sender_session_id: str(body.sender_session_id, 80) || 'anon',
        sender_name: str(body.sender_name, 60) || 'Guest',
        sender_table: senderTable,
        sender_avatar: str(body.sender_avatar, 8) || '☕',
        receiver_table: receiverTable,
        receiver_session_id: str(body.receiver_session_id, 80) || null,
        interaction_type: body.interaction_type,
        custom_message: str(body.custom_message, 200) || null,
        status: 'pending',
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, invitation: data });
  } catch (error: any) {
    console.error('[API Guest Lobby POST]', error);
    return fail('Could not send that. Please retry.', 500);
  }
}, 'GuestLobbyPOST');

export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const venue = await resolveVenue(request, body);
    if (venue.error) return venue.error;
    const businessId = venue.businessId;

    const limited = await enforceRateLimit(request, 'guest_lobby_patch', 240, 60_000, businessId);
    if (limited) return limited;

    if (body.status !== 'accepted' && body.status !== 'declined') return fail('Invalid status', 400);

    // Invitations the client only relayed over realtime have no DB row to update.
    if (!isUuid(body.invitation_id)) {
      return NextResponse.json({ success: true, status: body.status, chat_id: null, persisted: false });
    }

    const db = adminDb();
    const { data: invitation, error: invErr } = await db
      .from('table_invitations')
      .select('*')
      .eq('id', body.invitation_id)
      .eq('business_id', businessId)
      .eq('status', 'pending')
      .maybeSingle();
    if (invErr) throw invErr;
    if (!invitation) return fail('Invitation not found or already answered', 404);

    // Only the invited side may answer: by session when the invite named one, otherwise by table.
    const responderSession = str(body.receiver_session_id, 80);
    const responderTable = str(body.receiver_table, 12);
    const allowed = invitation.receiver_session_id
      ? invitation.receiver_session_id === responderSession
      : normTable(invitation.receiver_table) === normTable(responderTable);
    if (!allowed) return fail('Invitation not found or already answered', 404);

    let chatId: string | null = null;
    if (body.status === 'accepted') {
      const { data: chat, error: chatErr } = await db
        .from('private_chats')
        .insert({
          business_id: businessId,
          session_a: invitation.sender_session_id,
          session_b: responderSession || invitation.receiver_session_id || `table-${normTable(invitation.receiver_table)}`,
          table_a: invitation.sender_table,
          table_b: invitation.receiver_table,
          status: 'active',
        })
        .select('id')
        .single();
      if (chatErr) throw chatErr;
      chatId = chat.id;
    }

    const { data: updated, error: updErr } = await db
      .from('table_invitations')
      .update({ status: body.status, chat_id: chatId })
      .eq('id', invitation.id)
      .eq('status', 'pending')
      .select('id');
    if (updErr) throw updErr;
    if (!updated || updated.length === 0) return fail('Invitation not found or already answered', 404);

    return NextResponse.json({ success: true, status: body.status, chat_id: chatId });
  } catch (error: any) {
    console.error('[API Guest Lobby PATCH]', error);
    return fail('Could not answer that invitation. Please retry.', 500);
  }
}, 'GuestLobbyPATCH');
