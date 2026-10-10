import { Camera, Hand, MessageCircle, type LucideIcon } from 'lucide-react';
import type { LobbyKind } from '@/lib/guest/lobby-rules';
import type { LobbyFilter } from '@/lib/guest/lobby-posts-client';

export interface KindMeta {
  label: string;
  hint: string;
  Icon: LucideIcon;
  badge: string;
}

export const KIND_META: Record<LobbyKind, KindMeta> = {
  message: { label: 'Message', hint: 'Say hello to the room', Icon: MessageCircle, badge: 'bg-neutral-100 text-neutral-700' },
  moment: { label: 'Moment', hint: 'Share a photo from the cafe', Icon: Camera, badge: 'bg-amber-50 text-amber-800' },
  want: { label: 'Want', hint: 'Ask for something', Icon: Hand, badge: 'bg-emerald-50 text-emerald-800' },
};

export const FEED_FILTERS: Array<{ id: LobbyFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'moment', label: 'Moments' },
  { id: 'want', label: 'Wants' },
  { id: 'message', label: 'Messages' },
];
