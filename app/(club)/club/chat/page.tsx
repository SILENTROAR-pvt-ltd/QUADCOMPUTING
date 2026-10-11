'use client';

import { ClubShell } from '@/components/club/ClubShell';
import { ChatScreen } from '@/components/club/chat/ChatScreen';

export default function ClubChatPage() {
  return <ClubShell><ChatScreen roomId={null} /></ClubShell>;
}
