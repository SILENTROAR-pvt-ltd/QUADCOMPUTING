import { createClient } from '@/lib/supabase/client';
import type { LobbyPresenceUser, DynamicIslandNotificationItem, PrivateChatMessage, LobbyPublicMessage } from '@/lib/store/guest-lobby.store';

/** One realtime channel PER VENUE. A single shared 'room:lobby' put every venue's guests in one room. */
export const lobbyChannelName = (cafeId: string) => `room:lobby:${cafeId || 'none'}`;

const lobbyUrl = (cafeId: string, type?: string) =>
  `/api/guest/lobby?${type ? `type=${type}&` : ''}cafe_id=${encodeURIComponent(cafeId)}`;

export async function broadcastInvitation(
  targetUser: LobbyPresenceUser,
  currentSessionId: string,
  currentUserName: string,
  currentUserTable: string,
  payload: { interaction_type: 'coffee' | 'join' | 'message'; custom_message?: string },
  cafeId: string
) {
  const body = {
    sender_session_id: currentSessionId,
    sender_name: currentUserName,
    sender_table: currentUserTable,
    sender_avatar: '☕',
    receiver_table: targetUser.table_number,
    receiver_session_id: targetUser.session_id,
    interaction_type: payload.interaction_type,
    custom_message: payload.custom_message,
  };

  // Store first so peers receive the real invitation id; answering it later needs that id.
  let invitationId = `inv-${Date.now()}`;
  try {
    const res = await fetch(lobbyUrl(cafeId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (data?.invitation?.id) invitationId = data.invitation.id;
  } catch {}

  try {
    const supabase = createClient();
    await supabase.channel(lobbyChannelName(cafeId)).send({
      type: 'broadcast',
      event: 'invitation',
      payload: { ...body, id: invitationId },
    });
  } catch {}
}

export async function broadcastInvitationResponse(
  item: DynamicIslandNotificationItem,
  currentSessionId: string,
  currentUserName: string,
  currentUserTable: string,
  status: 'accepted' | 'declined',
  chatId: string | undefined,
  cafeId: string
) {
  // Persist the answer first: on accept the server creates the real chat and returns its id.
  let resolvedChatId = chatId;
  try {
    const res = await fetch(lobbyUrl(cafeId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invitation_id: item.id,
        status,
        receiver_session_id: currentSessionId,
        sender_session_id: item.sender_session_id,
        receiver_table: currentUserTable,
        sender_table: item.sender_table,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (data?.chat_id) resolvedChatId = data.chat_id;
  } catch {}

  try {
    const supabase = createClient();
    await supabase.channel(lobbyChannelName(cafeId)).send({
      type: 'broadcast',
      event: 'invitation_response',
      payload: {
        sender_session_id: item.sender_session_id,
        receiver_session_id: currentSessionId,
        receiver_name: currentUserName,
        receiver_table: currentUserTable,
        interaction_type: item.interaction_type,
        status,
        chat_id: resolvedChatId,
      },
    });
  } catch {}

  return resolvedChatId;
}

export async function broadcastChatMessage(newMsg: PrivateChatMessage, cafeId: string) {
  try {
    const supabase = createClient();
    await supabase.channel(lobbyChannelName(cafeId)).send({
      type: 'broadcast',
      event: 'chat_message',
      payload: newMsg,
    });
  } catch {}

  try {
    await fetch(lobbyUrl(cafeId, 'chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMsg),
    });
  } catch {}
}

export async function broadcastLobbyMessage(newMsg: LobbyPublicMessage, cafeId: string) {
  try {
    const supabase = createClient();
    await supabase.channel(lobbyChannelName(cafeId)).send({
      type: 'broadcast',
      event: 'lobby_message',
      payload: newMsg,
    });
  } catch {}

  try {
    await fetch(lobbyUrl(cafeId, 'messages'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMsg),
    });
  } catch {}
}
