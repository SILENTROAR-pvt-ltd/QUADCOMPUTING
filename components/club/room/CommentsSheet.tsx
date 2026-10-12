'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Send, Trash } from 'lucide-react';
import { Avatar, FOCUS, Notice, Spinner, field } from '../ui';
import { Sheet } from '../ui-extra';
import { clubFetch, timeAgo } from '../api';
import { ReportButton } from '../ReportButton';
import { PostBody } from './PostBody';
import type { Post, PostComment } from './types';

/** The conversation under a post: read, reply, delete your own, report others. */
export function CommentsSheet({ post, onClose, onCount }: { post: Post | null; onClose: () => void; onCount: (id: string, count: number) => void }) {
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const id = post?.id;

  const load = useCallback(async () => {
    if (!id) return;
    const res = await clubFetch(`/posts/${id}/comments`);
    if (!res.ok) return setError(res.error);
    setComments(res.data.comments);
    onCount(id, res.data.comments.length);
  }, [id, onCount]);

  useEffect(() => { setComments(null); setError(''); setText(''); void load(); }, [load]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || sending.current || !text.trim()) return;
    sending.current = true;
    setBusy(true);
    const res = await clubFetch(`/posts/${id}/comments`, { body: { body: text } });
    sending.current = false;
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setText('');
    setError('');
    void load();
  };

  const remove = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return;
    const res = await clubFetch(`/comments/${commentId}`, { method: 'DELETE' });
    if (res.ok) void load(); else setError(res.error);
  };

  return (
    <Sheet open={Boolean(post)} onClose={onClose} title="Comments" focusField={false}>
      {post && (
        <div className="rounded-2xl bg-[#14261b]/[0.04] p-3.5">
          <p className="text-sm font-semibold">{post.author.name} <span className="font-normal text-[#14261b]/60">· {timeAgo(post.created_at)}</span></p>
          <div className="line-clamp-4 [&>p:first-child]:mt-1"><PostBody body={post.body} place={post.place} region={null} /></div>
        </div>
      )}
      <ul className="mt-4 space-y-4">
        {comments === null && !error && <li><Spinner /></li>}
        {comments?.length === 0 && <li className="py-6 text-center text-sm text-[#14261b]/60">No comments yet. Start the conversation.</li>}
        {comments?.map((c) => (
          <li key={c.id} className="flex gap-3">
            <Link href={`/club/members/${c.author.user_id}`} className={`rounded-full ${FOCUS}`}><Avatar url={c.author.avatar_url} name={c.author.name} size={34} /></Link>
            <div className="min-w-0 flex-1">
              <p className="text-sm"><span className="font-semibold">{c.author.name}</span> <span className="text-xs text-[#14261b]/60">{timeAgo(c.created_at)}</span></p>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-[#14261b]/90">{c.body}</p>
            </div>
            {c.mine
              ? <button type="button" onClick={() => remove(c.id)} aria-label="Delete comment" className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#14261b]/60 hover:bg-[#14261b]/[0.06] hover:text-red-700 ${FOCUS}`}><Trash aria-hidden="true" className="h-3.5 w-3.5" /></button>
              : <ReportButton type="comment" id={c.id} compact label="Report comment" />}
          </li>
        ))}
      </ul>
      <div className="mt-4"><Notice>{error}</Notice></div>
      <form onSubmit={send} className="sticky bottom-0 mt-3 flex items-end gap-2 bg-[#fbfaf6] pt-2">
        <textarea aria-label="Write a comment" rows={1} maxLength={500} className={`${field} max-h-32 min-h-11 resize-none`} value={text} placeholder="Add a comment"
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(e); } }} />
        <button type="submit" disabled={busy || !text.trim()} aria-label="Send comment"
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#c8da4a] text-[#14261b] transition hover:bg-[#bccf3b] disabled:opacity-40 ${FOCUS}`}>
          <Send aria-hidden="true" className="h-4 w-4" />
        </button>
      </form>
    </Sheet>
  );
}
