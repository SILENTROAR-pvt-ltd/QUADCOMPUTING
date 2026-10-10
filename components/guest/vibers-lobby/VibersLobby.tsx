'use client';

import React from 'react';
import { useVibersLobby } from './useVibersLobby';
import { useLobbyEngagement } from './useLobbyEngagement';
import { LobbyComposer } from './LobbyComposer';
import { LobbyFilters } from './LobbyFilters';
import { LobbyFeed } from './LobbyFeed';

interface VibersLobbyProps {
  venueId: string;
  venueName: string;
  table: string;
  canPost: boolean;
  onRequestJoin: () => void;
}

/** Vibers Lobby: share moments and wants with everyone at the venue, and browse what others shared. */
export function VibersLobby({ venueId, venueName, table, canPost, onRequestJoin }: VibersLobbyProps) {
  const lobby = useVibersLobby(venueId);
  const engagement = useLobbyEngagement(venueId, lobby.posts, lobby.setPosts);
  const filtered = lobby.kind !== 'all' || lobby.mine || lobby.q !== '';

  return (
    <section aria-label="Vibers Lobby" className="space-y-5 pb-6">
      <div>
        <h2 className="font-serif text-2xl text-neutral-950">Vibers Lobby</h2>
        <p className="text-xs text-neutral-500">Moments, wants and messages from everyone at {venueName || 'the venue'}.</p>
      </div>

      <LobbyComposer table={table} canPost={canPost} onRequestJoin={onRequestJoin} onPost={lobby.post} />

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
    </section>
  );
}

export default VibersLobby;
