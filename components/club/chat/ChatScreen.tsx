'use client';

import React, { useState } from 'react';
import { RoomList, type RoomsData } from './RoomList';
import { ChatRoom } from './ChatRoom';
import { Spinner } from '../ui';

/** Chat layout: the room list beside the open room (stacked on phones). No roomId means the club chat. */
export function ChatScreen({ roomId }: { roomId: string | null }) {
  const [rooms, setRooms] = useState<RoomsData | null>(null);
  const activeId = roomId ?? rooms?.global.id ?? null;
  const room = rooms?.rooms.find((r) => r.id === activeId);
  const title = !roomId ? 'Club chat · everyone' : room?.title ?? 'Chat';

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className={roomId ? 'hidden lg:block' : ''}><RoomList activeId={activeId} onLoaded={setRooms} /></aside>
      {activeId ? <ChatRoom key={activeId} roomId={activeId} title={title} /> : <Spinner />}
    </div>
  );
}
