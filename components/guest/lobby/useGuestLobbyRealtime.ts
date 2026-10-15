'use client';

import { useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  useGuestLobbyStore,
  LobbyPresenceUser,
  DynamicIslandNotificationItem,
  PrivateChatMessage,
  LobbyPublicMessage,
} from '@/lib/store/guest-lobby.store';
import {
  broadcastInvitation,
  broadcastInvitationResponse,
  broadcastChatMessage,
  broadcastLobbyMessage,
  lobbyChannelName,
} from './lobby-realtime.service';

interface UseGuestLobbyRealtimeProps {
  cafeId: string;
  currentSessionId: string;
  currentUserName: string;
  currentUserTable: string;
}

export function useGuestLobbyRealtime({
  cafeId,
  currentSessionId,
  currentUserName,
  currentUserTable,
}: UseGuestLobbyRealtimeProps) {
  const {
    onlineUsers,
    setOnlineUsers,
    notifications,
    addNotification,
    removeNotification,
    activeChat,
    setActiveChat,
    addChatMessage,
    lobbyMessages,
    setLobbyMessages,
    addLobbyMessage,
  } = useGuestLobbyStore();

  useEffect(() => {
    let supabase: any;
    try {
      supabase = createClient();
    } catch {}

    if (!supabase) {
      setOnlineUsers([]);
      return;
    }

    // ── Vector 3: Stale-state cleanup on table-hop / identity change ──
    // Clear presence immediately when session/table identity changes to prevent
    // one table's guests bleeding into another table's UI state.
    setOnlineUsers([]);

    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isUnmounted = false;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;

    const channel = supabase.channel(lobbyChannelName(cafeId), {
      config: { presence: { key: currentSessionId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activeList: LobbyPresenceUser[] = [];

        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.session_id && p.session_id !== currentSessionId) {
              activeList.push(p);
            }
          });
        });

        setOnlineUsers(activeList);
      })
      .on('broadcast', { event: 'invitation' }, ({ payload }: any) => {
        if (
          payload.receiver_table === currentUserTable ||
          payload.receiver_session_id === currentSessionId
        ) {
          addNotification({
            id: payload.id || `notif-${Date.now()}`,
            sender_session_id: payload.sender_session_id,
            sender_name: payload.sender_name,
            sender_table: payload.sender_table,
            sender_avatar: payload.sender_avatar || '☕',
            receiver_table: currentUserTable,
            interaction_type: payload.interaction_type,
            custom_message: payload.custom_message,
            timestamp: Date.now(),
          });
        }
      })
      .on('broadcast', { event: 'invitation_response' }, ({ payload }: any) => {
        if (payload.sender_session_id === currentSessionId && payload.status === 'accepted') {
          setActiveChat({
            chat_id: payload.chat_id || `chat-${Date.now()}`,
            partner_name: payload.receiver_name,
            partner_table: payload.receiver_table,
            partner_avatar: '☕',
            partner_session_id: payload.receiver_session_id,
            messages: [
              {
                id: `init-${Date.now()}`,
                chat_id: payload.chat_id || `chat-${Date.now()}`,
                sender_session_id: payload.receiver_session_id,
                sender_name: payload.receiver_name,
                message: `Accepted your ${payload.interaction_type} request!`,
                created_at: new Date().toISOString(),
              },
            ],
          });
        }
      })
      .on('broadcast', { event: 'chat_message' }, ({ payload }: any) => {
        if (activeChat && activeChat.chat_id === payload.chat_id) {
          addChatMessage(payload);
        }
      })
      .on('broadcast', { event: 'lobby_message' }, ({ payload }: any) => {
        addLobbyMessage(payload);
      })
      .subscribe(async (status: string) => {
        if (isUnmounted) return;

        if (status === 'SUBSCRIBED') {
          reconnectAttempts = 0; // reset on successful connect
          await channel.track({
            session_id: currentSessionId,
            guest_name: currentUserName,
            avatar: '☕',
            table_number: currentUserTable,
            joinedAt: new Date().toISOString(),
          });
        }

        // ── Vector 2: WebSocket auto-reconnect with exponential backoff ──
        if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && !isUnmounted) {
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            reconnectAttempts++;
            console.warn(`[LobbyRealtime] WebSocket ${status}. Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
            reconnectTimeout = setTimeout(() => {
              if (!isUnmounted) {
                // Re-subscribe the same channel object — Supabase handles internal cleanup
                channel.subscribe();
              }
            }, delay);
          } else {
            console.error('[LobbyRealtime] Max reconnect attempts reached. Clearing stale presence.');
            setOnlineUsers([]); // Fail-safe: show 0 online rather than stale count
          }
        }
      });

    // ── Vector 5: Non-blocking initial message load ──
    fetch(`/api/guest/lobby?type=messages&cafe_id=${encodeURIComponent(cafeId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isUnmounted && data.messages && data.messages.length > 0) {
          setLobbyMessages(data.messages);
        }
      })
      .catch((err) => {
        // Silent degradation — UI already shows empty state, not an error
        console.warn('[LobbyRealtime] Failed to load initial messages (non-fatal):', err?.message);
      });

    return () => {
      isUnmounted = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      void supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the lobby channel is re-subscribed only when the venue, session, table or name changes; the chat state it reads would resubscribe it on every message
  }, [cafeId, currentSessionId, currentUserTable, currentUserName]);

  const handleSendInvitation = async (
    targetUser: LobbyPresenceUser,
    payload: { interaction_type: 'coffee' | 'join' | 'message'; custom_message?: string }
  ) => {
    await broadcastInvitation(
      targetUser,
      currentSessionId,
      currentUserName,
      currentUserTable,
      payload,
      cafeId
    );
  };

  const handleAcceptNotification = async (item: DynamicIslandNotificationItem) => {
    removeNotification(item.id);
    const generatedChatId = `chat-${Date.now()}`;

    const resolvedChatId = (await broadcastInvitationResponse(
      item,
      currentSessionId,
      currentUserName,
      currentUserTable,
      'accepted',
      generatedChatId,
      cafeId
    )) || generatedChatId;

    setActiveChat({
      chat_id: resolvedChatId,
      partner_name: item.sender_name,
      partner_table: item.sender_table,
      partner_avatar: '☕',
      partner_session_id: item.sender_session_id,
      messages: [
        {
          id: `init-${Date.now()}`,
          chat_id: resolvedChatId,
          sender_session_id: item.sender_session_id,
          sender_name: item.sender_name,
          message: item.custom_message || 'Connected!',
          created_at: new Date().toISOString(),
        },
      ],
    });
  };

  const handleDeclineNotification = async (item: DynamicIslandNotificationItem) => {
    removeNotification(item.id);
    await broadcastInvitationResponse(
      item,
      currentSessionId,
      currentUserName,
      currentUserTable,
      'declined',
      undefined,
      cafeId
    );
  };

  const handleSendChatMessage = async (text: string) => {
    if (!activeChat) return;

    const newMsg: PrivateChatMessage = {
      id: `msg-${Date.now()}`,
      chat_id: activeChat.chat_id,
      sender_session_id: currentSessionId,
      sender_name: currentUserName,
      message: text,
      created_at: new Date().toISOString(),
    };

    addChatMessage(newMsg);
    await broadcastChatMessage(newMsg, cafeId);
  };

  const handlePostLobbyMessage = async (content: string) => {
    const newMsg: LobbyPublicMessage = {
      id: `msg-${Date.now()}`,
      session_id: currentSessionId,
      guest_name: currentUserName,
      avatar: '☕',
      table_number: currentUserTable,
      content,
      created_at: new Date().toISOString(),
    };

    addLobbyMessage(newMsg);
    await broadcastLobbyMessage(newMsg, cafeId);
  };

  return {
    onlineUsers,
    notifications,
    activeChat,
    setActiveChat,
    lobbyMessages,
    handleSendInvitation,
    handleAcceptNotification,
    handleDeclineNotification,
    handleSendChatMessage,
    handlePostLobbyMessage,
  };
}
