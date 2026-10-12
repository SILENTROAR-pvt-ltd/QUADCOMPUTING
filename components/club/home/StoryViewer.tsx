'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Eye, MapPin, Trash, X } from 'lucide-react';
import { Avatar, FOCUS } from '../ui';
import { clubFetch, timeAgo } from '../api';
import { ReportButton } from '../ReportButton';
import { ViewersSheet } from './ViewersSheet';
import type { StoryGroup } from './story-types';
import styles from '../club.module.css';

const IMAGE_MS = 5000;
const HOLD_MS = 250;

/**
 * Full-screen stories, like Instagram: progress bars that fill and move on by themselves, tap the left
 * or right side to go back or forward, hold to pause, arrow keys and Escape. Watching a story leaves a
 * receipt for its author, who can see who watched it.
 */
export function StoryViewer({ queue, start = 0, onClose, onChanged }: {
  queue: StoryGroup[]; start?: number; onClose: () => void; onChanged?: () => void;
}) {
  const [gi, setGi] = useState(start);
  const [si, setSi] = useState(0);
  const [paused, setPaused] = useState(false);
  const [videoMs, setVideoMs] = useState<number | null>(null);
  const [viewersFor, setViewersFor] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const pressedAt = useRef(0);
  const held = useRef(false);

  const group = queue[gi];
  const story = group?.stories[si];
  const currentId = story?.id;
  const currentMine = story?.mine;
  const isVideo = story?.media_type === 'video';

  // The parent may pass a new onClose on every render; read it through a ref so the timer is not reset.
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; });

  const next = useCallback(() => {
    if (!group) return;
    if (si < group.stories.length - 1) return setSi(si + 1);
    if (gi < queue.length - 1) { setGi(gi + 1); setSi(0); return; }
    close.current();
  }, [group, si, gi, queue.length]);

  const prev = useCallback(() => {
    if (si > 0) return setSi(si - 1);
    if (gi > 0) { setGi(gi - 1); setSi(queue[gi - 1].stories.length - 1); }
  }, [si, gi, queue]);

  // Image timing runs on a JS timer (pauses are subtracted), so it moves on even when the pane does not
  // paint animations. The bar's CSS animation is only the visual fill.
  const elapsed = useRef(0);
  const startedAt = useRef(0);
  useEffect(() => { elapsed.current = 0; startedAt.current = Date.now(); }, [currentId]);
  useEffect(() => {
    if (!currentId || isVideo) return;
    if (paused) { elapsed.current += Date.now() - startedAt.current; return; }
    startedAt.current = Date.now();
    const t = setTimeout(next, Math.max(0, IMAGE_MS - elapsed.current));
    return () => clearTimeout(t);
  }, [paused, currentId, isVideo, next]);

  // Keyboard: Escape closes, arrows move.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [next, prev, onClose]);

  // A new story starts its own clock; a video's length comes from the file itself.
  useEffect(() => { setVideoMs(null); }, [currentId]);

  // Leave a receipt once per story shown (your own stories do not count).
  useEffect(() => {
    if (currentId && !currentMine) void clubFetch(`/stories/${currentId}/view`, { body: {} });
  }, [currentId, currentMine]);

  // Pause the video with the bars.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (paused) v.pause(); else void v.play().catch(() => {});
  }, [paused, currentId]);

  if (!group || !story) return null;
  const durationMs = story.media_type === 'video' ? videoMs ?? 15000 : IMAGE_MS;
  const press = () => { pressedAt.current = Date.now(); setPaused(true); };
  const release = () => { held.current = Date.now() - pressedAt.current > HOLD_MS; setPaused(false); };
  const tap = (go: () => void) => () => {
    if (held.current) { held.current = false; return; }
    go();
  };

  const remove = async () => {
    const res = await clubFetch(`/stories/${story.id}`, { method: 'DELETE' });
    if (res.ok) { onChanged?.(); onClose(); }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`${group.member.name}'s stories`} className="fixed inset-0 z-[60] grid place-items-center bg-[#0c140f]/90 p-0 backdrop-blur-sm sm:p-6">
      <div className="relative h-full w-full overflow-hidden bg-[#14261b] sm:h-[min(88dvh,820px)] sm:max-w-[430px] sm:rounded-[36px]">
        {/* Progress: one bar per story; the current one fills, then the next story starts. */}
        <div className="absolute inset-x-0 top-0 z-30 flex gap-1 px-3 pt-3">
          {group.stories.map((s, k) => (
            <span key={s.id} className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
              {k < si && <span className="absolute inset-0 bg-white" />}
              {k === si && (
                <span key={story.id} className={`${styles.storyFill} absolute inset-0 bg-white`}
                  style={{ animationDuration: `${durationMs}ms`, animationPlayState: paused ? 'paused' : 'running' }} />
              )}
            </span>
          ))}
        </div>

        {/* Header: who, when, and where. */}
        <div className="absolute inset-x-0 top-6 z-30 flex items-center gap-3 px-4 text-[#f6f4ec]">
          <Avatar url={group.member.avatar_url} name={group.member.name} size={38} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{group.mine ? 'Your story' : group.member.name}</p>
            <p className="flex items-center gap-1.5 truncate text-xs text-white/75">
              {timeAgo(story.created_at)}
              {story.place && <><span aria-hidden="true">·</span><MapPin aria-hidden="true" className="h-3 w-3" /><span className="truncate">{story.place.name}</span></>}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close stories" className={`grid h-9 w-9 place-items-center rounded-full bg-black/25 hover:bg-black/40 ${FOCUS}`}><X aria-hidden="true" className="h-5 w-5" /></button>
        </div>

        {/* The picture or clip. Press and hold to pause. */}
        <div className="absolute inset-0 bg-black" onPointerDown={press} onPointerUp={release} onPointerLeave={release} onPointerCancel={release}>
          {story.url && (story.media_type === 'video'
            ? <video key={story.id} ref={video} src={story.url} autoPlay playsInline onLoadedMetadata={(e) => setVideoMs(e.currentTarget.duration * 1000)} onEnded={next} className="h-full w-full object-cover" />
            // eslint-disable-next-line @next/next/no-img-element
            : <img key={story.id} src={story.url} alt={story.caption || `${group.member.name}'s story`} className="h-full w-full object-cover" />)}
        </div>

        {/* Invisible halves: the left goes back, the right goes on. */}
        <button type="button" aria-label="Previous story" onClick={tap(prev)} onPointerDown={press} onPointerUp={release} onPointerLeave={release} onPointerCancel={release}
          className="absolute inset-y-24 left-0 z-20 w-1/3 cursor-pointer focus-visible:outline-none" />
        <button type="button" aria-label="Next story" onClick={tap(next)} onPointerDown={press} onPointerUp={release} onPointerLeave={release} onPointerCancel={release}
          className="absolute inset-y-24 right-0 z-20 w-2/3 cursor-pointer focus-visible:outline-none" />

        {/* Footer: caption, verified stay, and what you can do. */}
        <div className="absolute inset-x-0 bottom-0 z-30 space-y-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-5 pb-6 pt-16 text-white">
          {story.verified_stay && <span className="inline-flex items-center gap-1 rounded-full bg-[#c8da4a] px-2.5 py-1 text-[11px] font-bold text-[#14261b]"><BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" /> Verified stay</span>}
          {story.caption && <p className="text-[15px] leading-snug">{story.caption}</p>}
          <div className="flex items-center justify-between gap-3">
            {group.mine ? (
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setViewersFor(story.id)} className={`inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25 ${FOCUS}`}>
                  <Eye aria-hidden="true" className="h-3.5 w-3.5" /> Seen by {story.viewers ?? 0}
                </button>
                <button type="button" onClick={remove} className={`inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25 ${FOCUS}`}>
                  <Trash aria-hidden="true" className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            ) : (
              <ReportButton type="story" id={story.id} />
            )}
            {story.place && (
              <Link href={`/club/places/${story.place.id}`} onClick={onClose} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#14261b] ${FOCUS}`}>
                <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-[#3c6b2b]" /> See {story.place.name}
              </Link>
            )}
          </div>
        </div>
      </div>
      <ViewersSheet storyId={viewersFor} open={Boolean(viewersFor)} onClose={() => setViewersFor(null)} />
    </div>
  );
}
