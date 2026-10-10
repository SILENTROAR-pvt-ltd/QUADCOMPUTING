import { create } from 'zustand';

export interface GuestSession {
  customer_id?: string;
  session_id: string;
  table_id?: string | null;
  table_number: string;
  guest_name: string;
  avatar: string;
  cafe_id?: string;
  business_id?: string | null;
  business_name?: string;
  status: 'active' | 'inactive';
  is_settled?: boolean;
  created_at?: string;
}

export interface LobbyPresenceUser {
  session_id: string;
  guest_name: string;
  avatar: string;
  table_number: string;
  statusText?: string;
  joinedAt: string;
}

export interface DynamicIslandNotificationItem {
  id: string;
  sender_session_id: string;
  sender_name: string;
  sender_table: string;
  sender_avatar: string;
  receiver_table: string;
  interaction_type: 'coffee' | 'join' | 'message';
  custom_message?: string;
  chat_id?: string;
  timestamp: number;
}

export interface PrivateChatMessage {
  id: string;
  chat_id: string;
  sender_session_id: string;
  sender_name: string;
  message: string;
  created_at: string;
}

export interface ActivePrivateChat {
  chat_id: string;
  partner_name: string;
  partner_table: string;
  partner_avatar: string;
  partner_session_id: string;
  messages: PrivateChatMessage[];
}

export interface LobbyPublicMessage {
  id: string;
  session_id: string;
  guest_name: string;
  avatar: string;
  table_number: string;
  content: string;
  created_at: string;
}

interface GuestLobbyStore {
  session: GuestSession | null;
  setSession: (session: GuestSession | null) => void;
  setSessionSettled: (isSettled: boolean) => void;

  // Presence
  onlineUsers: LobbyPresenceUser[];
  setOnlineUsers: (users: LobbyPresenceUser[]) => void;

  // Dynamic Island Toasts
  notifications: DynamicIslandNotificationItem[];
  addNotification: (notification: DynamicIslandNotificationItem) => void;
  removeNotification: (id: string) => void;

  // Private Chat
  activeChat: ActivePrivateChat | null;
  setActiveChat: (chat: ActivePrivateChat | null) => void;
  addChatMessage: (msg: PrivateChatMessage) => void;

  // Public Lobby Feed
  lobbyMessages: LobbyPublicMessage[];
  setLobbyMessages: (messages: LobbyPublicMessage[]) => void;
  addLobbyMessage: (msg: LobbyPublicMessage) => void;
}

const STORAGE_KEY = 'quad_guest_session_v2';

export const useGuestLobbyStore = create<GuestLobbyStore>((set, get) => {
  // Try initialize session from localStorage if in client
  let initialSession: GuestSession | null = null;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        initialSession = JSON.parse(stored);
      }
    } catch {}
  }

  return {
    session: initialSession,
    setSession: (session) => {
      if (typeof window !== 'undefined') {
        if (session) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      set({ session });
    },
    setSessionSettled: (is_settled: boolean) => {
      set((state) => {
        if (!state.session) return state;
        const updated = { ...state.session, is_settled };
        if (typeof window !== 'undefined') {
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
        }
        return { session: updated };
      });
    },

    onlineUsers: [],
    setOnlineUsers: (onlineUsers) => set({ onlineUsers }),

    notifications: [],
    addNotification: (item) => {
      set((state) => ({
        notifications: [item, ...state.notifications.filter((n) => n.id !== item.id)],
      }));
    },
    removeNotification: (id) => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    },

    activeChat: null,
    setActiveChat: (activeChat) => set({ activeChat }),
    addChatMessage: (msg) => {
      set((state) => {
        if (!state.activeChat || state.activeChat.chat_id !== msg.chat_id) return state;
        return {
          activeChat: {
            ...state.activeChat,
            messages: [...state.activeChat.messages, msg],
          },
        };
      });
    },

    // Real messages only (loaded per venue). A seeded "concierge" message used
    // to appear in every venue's lounge, naming the platform and inventing
    // things the venue may not offer.
    lobbyMessages: [],
    setLobbyMessages: (lobbyMessages) => set({ lobbyMessages }),
    addLobbyMessage: (msg) => {
      set((state) => ({
        lobbyMessages: [msg, ...state.lobbyMessages],
      }));
    },
  };
});
