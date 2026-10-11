'use client';

import { useParams } from 'next/navigation';
import { ClubShell } from '@/components/club/ClubShell';
import { ChatScreen } from '@/components/club/chat/ChatScreen';

export default function ClubRoomPage() {
  const params = useParams<{ roomId: string }>();
  return <ClubShell><ChatScreen roomId={params?.roomId ?? null} /></ClubShell>;
}
