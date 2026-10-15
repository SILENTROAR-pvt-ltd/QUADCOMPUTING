'use client';

import React, { useState } from 'react';
import { useVibersLobby } from './useVibersLobby';
import { useLobbyEngagement } from './useLobbyEngagement';
import { LobbyComposer } from './LobbyComposer';
import { LobbyFilters } from './LobbyFilters';
import { LobbyFeed } from './LobbyFeed';
import { PostcardComposer } from './PostcardComposer';
import { POSTCARD_SERIF } from './MemoryPostcard';
import { LoungeHero } from './LoungeHero';

interface VibersLobbyProps {
  venueId: string;
  venueName: string;
  table: string;
  guestName: string;
  canPost: boolean;
  onRequestJoin: () => void;
}

/** Vibers Lobby: postcards and messages from everyone at the venue, and a way to leave a memory of your own. */
export function VibersLobby({ venueId, venueName, table, guestName, canPost, onRequestJoin }: VibersLobbyProps) {
  const lobby = useVibersLobby(venueId);
  const engagement = useLobbyEngagement(venueId, lobby.posts, lobby.setPosts);
  const filtered = lobby.kind !== 'all' || lobby.mine || lobby.q !== '';
  const [writing, setWriting] = useState(false);
  const [thanks, setThanks] = useState(false);

  const posted = () => {
    setWriting(false);
    setThanks(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setThanks(false), 4500);
  };

  return (
    <section aria-label="Vibers Lobby" className="space-y-6 pb-6">
      <LoungeHero venueName={venueName} />

      {thanks && (
        <p role="status" className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-center text-[13px] text-zinc-700">
          <span style={POSTCARD_SERIF} className="text-[16px] text-zinc-950">Your postcard is on the wall.</span>
          <span className="mt-0.5 block text-[12px] text-zinc-500">Thank you for sharing a piece of your day with us.</span>
        </p>
      )}

      <LobbyComposer
        venueName={venueName}
        table={table}
        canPost={canPost}
        onRequestJoin={onRequestJoin}
        onPost={lobby.post}
        onWritePostcard={() => setWriting(true)}
      />

      <LobbyFilters
        kind={lobby.kind}
        onKind={lobby.setKind}
        mine={lobby.mine}
        onMine={lobby.setMine}
        onSearch={lobby.setQ}
        canSeeMine={canPost}
      />

      <LobbyFeed
        venueId={venueId}
        venueName={venueName}
        onWrite={() => (canPost ? setWriting(true) : onRequestJoin())}
        posts={lobby.posts}
        loading={lobby.loading}
        loadingMore={lobby.loadingMore}
        hasMore={lobby.hasMore}
        error={lobby.error}
        filtered={filtered}
        canEngage={canPost}
        onRetry={lobby.retry}
        onLoadMore={lobby.loadMore}
        onRemove={lobby.remove}
        onLike={engagement.like}
        onRequestJoin={onRequestJoin}
        onRepliesChanged={engagement.repliesChanged}
      />

      {writing && (
        <PostcardComposer
          venueName={venueName}
          table={table}
          guestName={guestName}
          onClose={() => setWriting(false)}
          onPost={(input) => lobby.post(input)}
          onPosted={posted}
        />
      )}
    </section>
  );
}

export default VibersLobby;