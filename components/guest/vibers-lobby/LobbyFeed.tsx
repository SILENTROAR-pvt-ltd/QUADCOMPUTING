'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { ListSkeleton } from '@/components/guest/shared/ListSkeleton';
import type { LobbyPostView } from '@/lib/services/lobby/lobby-post-view';
import { LobbyPostCard } from './LobbyPostCard';
import { POSTCARD_SERIF } from './MemoryPostcard';
import { Print } from './LoungeHero';
import { LOUNGE_MEDIA, LOUNGE_TINT } from './lounge-media';

type Result = { ok: boolean; error?: string };

interface LobbyFeedProps {
  venueId: string;
  venueName: string;
  /** Opens the postcard composer from the empty state. */
  onWrite: () => void;
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

function Empty({ filtered, venueName, canWrite, onWrite }: { filtered: boolean; venueName: string; canWrite: boolean; onWrite: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d9cfb6] bg-[#fffdf8] px-6 py-10 text-center">
      {!filtered && (
        <div aria-hidden className="mx-auto mb-5 flex h-[112px] items-center justify-center">
          <Print src={LOUNGE_MEDIA.toast} tint={LOUNGE_TINT.toast} tilt={-7} className="w-[78px] -mr-2" />
          <Print src={LOUNGE_MEDIA.feast} tint={LOUNGE_TINT.feast} tilt={6} className="w-[78px] mt-4" />
        </div>
      )}
      <p className="text-[20px] text-zinc-950" style={POSTCARD_SERIF}>{filtered ? 'Nothing matches that' : 'No postcards on the wall yet'}</p>
      <p className="mx-auto mt-1.5 max-w-[260px] text-[12.5px] leading-snug text-zinc-500">
        {filtered ? 'Try another filter or search.' : `Be the first to leave a memory at ${venueName || 'the venue'}.`}
      </p>
      {!filtered && canWrite && (
        <button type="button" onClick={onWrite} className="mt-4 inline-flex h-10 items-center rounded-full bg-zinc-950 px-5 text-[13px] font-semibold text-white cursor-pointer">Write a postcard</button>
      )}
    </div>
  );
}
/** The lobby's posts, newest first, with a clear state for loading, errors, and empty results. */
export function LobbyFeed(props: LobbyFeedProps) {
  const { venueId, venueName, onWrite, posts, loading, loadingMore, hasMore, error, filtered, canEngage, onRetry, onLoadMore } = props;

  if (loading && posts.length === 0) {
    return (
      <ListSkeleton rows={3} label="Loading the lobby" />
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

  if (posts.length === 0) return <Empty filtered={filtered} venueName={venueName} canWrite={canEngage} onWrite={onWrite} />;

  return (
    <div className="space-y-5">
      {error && <p role="alert" className="text-xs font-medium text-rose-600">{error}</p>}
      {posts.map((p) => (
        <LobbyPostCard
          key={p.id}
          venueId={venueId}
          venueName={venueName}
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
