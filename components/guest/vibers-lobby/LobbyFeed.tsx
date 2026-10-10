'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import type { LobbyPostView } from '@/lib/services/lobby/lobby-post-view';
import { LobbyPostCard } from './LobbyPostCard';

type Result = { ok: boolean; error?: string };

interface LobbyFeedProps {
  venueId: string;
  posts: LobbyPostView[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  filtered: boolean;
  canEngage: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
  onRemove: (id: string) => Promise<Result>;
  onLike: (id: string) => Promise<Result>;
  onRequestJoin: () => void;
  onRepliesChanged: (id: string, delta: number) => void;
}

function Empty({ filtered }: { filtered: boolean }) {
  return (
    <div className="rounded-3xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
      <p className="font-serif text-lg text-neutral-900">{filtered ? 'Nothing matches that' : 'The lobby is quiet'}</p>
      <p className="mt-1 text-xs text-neutral-500">
        {filtered ? 'Try another filter or search.' : 'Share the first moment or ask for something.'}
      </p>
    </div>
  );
}

/** The lobby's posts, newest first, with a clear state for loading, errors, and empty results. */
export function LobbyFeed(props: LobbyFeedProps) {
  const { venueId, posts, loading, loadingMore, hasMore, error, filtered, canEngage, onRetry, onLoadMore } = props;

  if (loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-neutral-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading the lobby…
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className="rounded-3xl border border-neutral-200 bg-white px-6 py-10 text-center">
        <p className="text-sm text-neutral-700">{error}</p>
        <button type="button" onClick={onRetry} className="mt-3 rounded-2xl border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-900 cursor-pointer">
          Try again
        </button>
      </div>
    );
  }

  if (posts.length === 0) return <Empty filtered={filtered} />;

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="text-xs font-medium text-rose-600">{error}</p>}
      {posts.map((p) => (
        <LobbyPostCard
          key={p.id}
          venueId={venueId}
          post={p}
          canEngage={canEngage}
          onRemove={props.onRemove}
          onLike={props.onLike}
          onRequestJoin={props.onRequestJoin}
          onRepliesChanged={props.onRepliesChanged}
        />
      ))}
      {hasMore && (
        <div className="pt-2 text-center">
          <button type="button" onClick={onLoadMore} disabled={loadingMore} className="inline-flex items-center gap-1.5 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-900 disabled:opacity-50 cursor-pointer">
            {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Load older posts
          </button>
        </div>
      )}
    </div>
  );
}

export default LobbyFeed;
