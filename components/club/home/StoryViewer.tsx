'use client';

import React, { useState } from 'react';
import { BadgeCheck, ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { Avatar } from '../ui';
import { clubFetch } from '../api';
import { ReportButton } from '../ReportButton';

export interface StoryGroup {
  member: { user_id: string; name: string; avatar_url: string | null };
  stories: Array<{ id: string; media_type: 'image' | 'video'; url: string | null; caption: string | null; verified_stay: boolean; created_at: string; mine: boolean }>;
}

/** Full-screen story viewer with the verified-stay badge, report and (for your own) delete. */
export function StoryViewer({ group, onClose, onChanged }: { group: StoryGroup; onClose: () => void; onChanged: () => void }) {
  const [i, setI] = useState(0);
  const story = group.stories[i];
  if (!story) return null;
  const hoursAgo = Math.max(1, Math.round((Date.now() - Date.parse(story.created_at)) / 3600_000));

  const remove = async () => {
    const res = await clubFetch(`/stories/${story.id}`, { method: 'DELETE' });
    if (res.ok) { onChanged(); onClose(); }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`${group.member.name}'s story`} className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-black" onClick={(e) => e.stopPropagation()}>
        <div className="absolute inset-x-0 top-0 z-10 flex gap-1 p-2">
          {group.stories.map((s, k) => <span key={s.id} className={`h-0.5 flex-1 rounded-full ${k <= i ? 'bg-white' : 'bg-white/30'}`} />)}
        </div>
        <div className="absolute inset-x-0 top-3 z-10 flex items-center gap-2 px-3 pt-2 text-white">
          <Avatar url={group.member.avatar_url} name={group.member.name} size={32} />
          <span className="text-sm font-semibold">{group.member.name}</span>
          <span className="text-xs text-white/60">{hoursAgo}h</span>
          <button type="button" onClick={onClose} aria-label="Close" className="ml-auto rounded-full p-1 hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid aspect-[9/16] place-items-center">
          {story.url && (story.media_type === 'video'
            ? <video src={story.url} autoPlay playsInline controls className="h-full w-full object-contain" />
            // eslint-disable-next-line @next/next/no-img-element
            : <img src={story.url} alt={story.caption || 'Story'} className="h-full w-full object-contain" />)}
        </div>
        <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
          {story.verified_stay && <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold"><BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" /> Verified stay</span>}
          {story.caption && <p className="text-sm">{story.caption}</p>}
          <div className="flex items-center justify-between">
            {story.mine
              ? <button type="button" onClick={remove} className="inline-flex items-center gap-1 text-xs text-white/70 hover:text-white"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
              : <span className="[&_button]:text-white/70"><ReportButton type="story" id={story.id} /></span>}
            <span className="flex gap-1">
              <button type="button" aria-label="Previous" disabled={i === 0} onClick={() => setI(i - 1)} className="rounded-full p-1.5 hover:bg-white/10 disabled:opacity-30"><ChevronLeft className="h-5 w-5" /></button>
              <button type="button" aria-label="Next" disabled={i === group.stories.length - 1} onClick={() => setI(i + 1)} className="rounded-full p-1.5 hover:bg-white/10 disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
