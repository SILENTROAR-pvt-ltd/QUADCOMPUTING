// components/guest/lobby/types.ts
export interface ThreadReply {
  id: string;
  author: string;
  table: string;
  content: string;
  timestamp: string;
}

export interface LobbyPost {
  id: string;
  author: string;
  table: string;
  content: string;
  imageUrl?: string;
  timestamp: string;
  likes: number;
  isNew?: boolean;
  replies?: ThreadReply[];
}
