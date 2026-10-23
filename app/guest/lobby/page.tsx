'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGuestLobbyStore, LobbyPresenceUser } from '@/lib/store/guest-lobby.store';
import { DynamicIslandNotification } from '@/components/guest/DynamicIslandNotification';
import { TableInteractionModal } from '@/components/guest/TableInteractionModal';
import { PrivateChatModal } from '@/components/guest/PrivateChatModal';
import { useGuestLobbyRealtime } from '@/components/guest/lobby/useGuestLobbyRealtime';
import { LobbyUsernameModal } from '@/components/guest/lobby/LobbyUsernameModal';
import { LoungeTopBar, LOUNGE_VIEWS, type LoungeView } from '@/components/guest/lobby/LoungeTopBar';
import { LoungeViews } from '@/components/guest/lobby/LoungeViews';
import { useLoungeIdentity } from '@/components/guest/lobby/useLoungeIdentity';
import { GuestTabBar } from '@/components/guest/shell/GuestTabBar';
import { resolveLoungeCafeId } from '@/lib/guest/lounge-params';
import { LUXE_FONT_VAR } from '@/components/guest/luxe/luxe-theme';

function GuestLobbyContent() {
  const searchParams = useSearchParams();
  const tableParam = searchParams.get('table') || 'T-01';
  const viewParam = searchParams.get('view');
  // A guest who came from their room keeps the room on the way back to the menu.
  const roomParam = searchParams.get('room') || undefined;

  const { session } = useGuestLobbyStore();
  const cafeId = resolveLoungeCafeId(
    searchParams.get('cafe_id') || searchParams.get('venue') || searchParams.get('cafe') || '',
    session?.business_id || ''
  );

  const [view, setView] = useState<LoungeView>(
    LOUNGE_VIEWS.some((v) => v.id === viewParam) ? (viewParam as LoungeView) : 'chat'
  );
  const [selectedTargetUser, setSelectedTargetUser] = useState<LobbyPresenceUser | null>(null);
  const identity = useLoungeIdentity(cafeId, tableParam);

  // The persisted guest session only exists in the browser, so values read from
  // it are applied after mount; rendering them on the first pass caused a
  // server/client hydration mismatch.
  const [mounted, setMounted] = useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  const currentSessionId = session?.session_id || 'gst-current';
  const currentUserName = identity.guestHandle || 'Guest';
  const currentUserTable = (mounted && session?.table_number) || tableParam;
  const venueName = (mounted && session?.business_name) || '';

  const {
    onlineUsers,
    notifications,
    activeChat,
    setActiveChat,
    handleSendInvitation,
    handleAcceptNotification,
    handleDeclineNotification,
    handleSendChatMessage,
  } = useGuestLobbyRealtime({ cafeId, currentSessionId, currentUserName, currentUserTable });

  const selectView = (next: LoungeView) => {
    setView(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`${LUXE_FONT_VAR} min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[#f5f1e8] text-[#10231a] font-sans selection:bg-[#d9c193] selection:text-[#10231a] pb-[calc(env(safe-area-inset-bottom,0px)+7.5rem)]`}>
      <DynamicIslandNotification
        notifications={notifications}
        onAccept={handleAcceptNotification}
        onDecline={handleDeclineNotification}
      />

      <LoungeTopBar
        venueName={venueName}
        table={currentUserTable}
        onlineCount={onlineUsers.length + 1}
        view={view}
        onSelect={selectView}
      />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-4">
        <LoungeViews
          view={view}
          venueId={cafeId}
          venueName={venueName}
          table={currentUserTable}
          guestName={currentUserName}
          canPost={!identity.browsing && Boolean(identity.guestHandle)}
          onRequestJoin={identity.openOnboarding}
        />
      </main>

      <aside className="fixed bottom-3 sm:bottom-4 inset-x-0 z-50 flex justify-center px-3 pointer-events-none pb-[env(safe-area-inset-bottom,0px)]">
        <GuestTabBar active="lounge" tableNumber={currentUserTable} cafeId={cafeId} roomCode={roomParam} />
      </aside>

      {selectedTargetUser && (
        <TableInteractionModal
          targetUser={selectedTargetUser}
          currentUserTable={currentUserTable}
          currentUserName={currentUserName}
          onClose={() => setSelectedTargetUser(null)}
          onSendInvitation={(payload) => handleSendInvitation(selectedTargetUser, payload)}
        />
      )}

      {activeChat && (
        <PrivateChatModal
          chat={activeChat}
          currentSessionId={currentSessionId}
          currentUserName={currentUserName}
          onClose={() => setActiveChat(null)}
          onSendMessage={handleSendChatMessage}
        />
      )}

      <LobbyUsernameModal
        isOpen={identity.showOnboarding}
        currentUserTable={currentUserTable}
        cafeId={cafeId}
        onComplete={identity.handleOnboardingComplete}
        onSkip={identity.handleBrowseOnly}
      />
    </div>
  );
}

export default function GuestLobbyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center">
          <div className="h-5 w-5 border-2 border-neutral-900 border-t-transparent animate-spin rounded-full" />
        </div>
      }
    >
      <GuestLobbyContent />
    </Suspense>
  );
}
