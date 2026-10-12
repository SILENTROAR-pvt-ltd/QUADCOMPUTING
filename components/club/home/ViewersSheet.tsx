'use client';

import React, { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { Avatar, Notice, Spinner } from '../ui';
import { Sheet } from '../ui-extra';
import { clubFetch, timeAgo } from '../api';

interface Viewer { user_id: string; name: string; avatar_url: string | null; viewed_at: string }

/** "Seen by": the people who watched your story, newest first. Only you can open this. */
export function ViewersSheet({ storyId, open, onClose }: { storyId: string | null; open: boolean; onClose: () => void }) {
  const [viewers, setViewers] = useState<Viewer[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !storyId) return;
    setViewers(null);
    setError('');
    void clubFetch<{ count: number; viewers: Viewer[] }>(`/stories/${storyId}/viewers`).then((r) => {
      if (r.ok) setViewers(r.data.viewers); else setError(r.error);
    });
  }, [open, storyId]);

  return (
    <Sheet open={open} onClose={onClose} title="Seen by" focusField={false}>
      <Notice>{error}</Notice>
      {!viewers && !error && <Spinner />}
      {viewers?.length === 0 && (
        <p className="flex flex-col items-center gap-2 py-8 text-center text-sm text-[#14261b]/60"><Eye aria-hidden="true" className="h-6 w-6" />No one has watched this yet.</p>
      )}
      <ul className="divide-y divide-[#14261b]/[0.06]">
        {viewers?.map((v) => (
          <li key={v.user_id} className="flex items-center gap-3 py-3">
            <Avatar url={v.avatar_url} name={v.name} size={40} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{v.name}</span>
            <span className="shrink-0 text-xs text-[#14261b]/55">{timeAgo(v.viewed_at)}</span>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
