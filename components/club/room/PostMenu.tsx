'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Ellipsis, Flag, Trash, UserRound } from 'lucide-react';
import { FOCUS } from '../ui';
import { clubFetch } from '../api';
import { ReportSheet } from '../ReportButton';
import type { Post } from './types';

const row = `flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-[#14261b]/[0.06] ${FOCUS}`;

/** The "…" menu on a post: view the author, report it, or delete your own. */
export function PostMenu({ post, onRemoved }: { post: Post; onRemoved: () => void }) {
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [error, setError] = useState('');
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', esc); };
  }, [open]);

  const remove = async () => {
    setOpen(false);
    if (!window.confirm('Delete this post? Its likes and comments go with it.')) return;
    const res = await clubFetch(`/posts/${post.id}`, { method: 'DELETE' });
    if (res.ok) onRemoved(); else setError(res.error);
  };

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} aria-label="Post options"
        className={`grid h-9 w-9 place-items-center rounded-full text-[#14261b]/70 hover:bg-[#14261b]/[0.06] hover:text-[#14261b] ${FOCUS}`}>
        <Ellipsis aria-hidden="true" className="h-5 w-5" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-10 z-20 w-52 rounded-2xl border border-[#14261b]/10 bg-[#f2f0e8] p-1.5 shadow-2xl">
          <Link role="menuitem" href={`/club/members/${post.author.user_id}`} className={row}><UserRound aria-hidden="true" className="h-4 w-4" /> View profile</Link>
          {post.mine
            ? <button role="menuitem" type="button" onClick={remove} className={`${row} text-red-700`}><Trash aria-hidden="true" className="h-4 w-4" /> Delete post</button>
            : <button role="menuitem" type="button" onClick={() => { setOpen(false); setReporting(true); }} className={`${row} text-red-700`}><Flag aria-hidden="true" className="h-4 w-4" /> Report post</button>}
        </div>
      )}
      {error && <p role="alert" className="absolute right-0 top-10 w-52 rounded-xl bg-red-100 px-3 py-2 text-xs text-red-800">{error}</p>}
      <ReportSheet type="post" id={post.id} open={reporting} onClose={() => setReporting(false)} />
    </div>
  );
}
