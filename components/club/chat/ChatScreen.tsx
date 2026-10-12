'use client';

import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Screen } from '../nav/Screen';
import { Spinner } from '../ui';
import { RoomList, type RoomsData } from './RoomList';
import { ChatRoom } from './ChatRoom';
import { useIsDesktop } from './useIsDesktop';

/**
 * Messages. Phones: the inbox, or one open room. Desktop: the inbox beside the open room (the club
 * chat when none is chosen). A room is only opened when it is on screen, because opening marks it read.
 */
export function ChatScreen({ roomId }: { roomId: string | null }) {
  const [rooms, setRooms] = useState<RoomsData | null>(null);
  const desktop = useIsDesktop();
  const activeId = roomId ?? (desktop ? rooms?.global.id ?? null : null);
  const isGlobal = Boolean(rooms && activeId === rooms.global.id);
  const room = rooms?.rooms.find((r) => r.id === activeId);
  const title = isGlobal ? 'Club chat' : room?.title ?? 'Chat';
  const sub = isGlobal ? 'Every approved member' : room?.kind === 'event' ? 'Plan discussion' : room?.kind === 'dm' ? 'Direct message' : '';

  return (
    <Screen title={roomId && !desktop ? title : 'Messages'} icon={roomId && !desktop ? undefined : MessageSquare} back={roomId ? '/club/chat' : undefined} width="wide" fill={Boolean(roomId) || desktop}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className={roomId ? 'hidden lg:block' : ''}><RoomList activeId={activeId} onLoaded={setRooms} /></aside>
        {activeId ? <ChatRoom key={activeId} roomId={activeId} title={title} sub={sub} peer={room?.peer ?? null} /> : desktop && <Spinner />}
      </div>
    </Screen>
  );
}
