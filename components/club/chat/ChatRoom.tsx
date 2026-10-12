'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Globe, ImagePlus, Send } from 'lucide-react';
import { Avatar, FOCUS, Notice, Spinner, field } from '../ui';
import { clubFetch, uploadMedia } from '../api';
import { useClub } from '../club-context';
import { MessageBubble, type ChatMessage } from './MessageBubble';
import { useRoomRealtime } from './useRoomRealtime';
import styles from '../club.module.css';

interface Props { roomId: string; title: string; sub?: string; peer?: { avatar_url: string | null; name: string } | null }

/** One chat room: newest messages, older pages on demand, photo upload, reactions and typing. */
export function ChatRoom({ roomId, title, sub, peer }: Props) {
  const { me } = useClub();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [older, setOlder] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const end = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await clubFetch(`/rooms/${roomId}/messages`);
    if (!res.ok) return setError(res.error);
    setMessages((prev) => {
      const keepOlder = (prev || []).filter((m) => !res.data.messages.some((n: ChatMessage) => n.id === m.id) && Date.parse(m.created_at) < Date.parse(res.data.messages[0]?.created_at || '0'));
      return [...keepOlder, ...res.data.messages];
    });
    setOlder((o) => o ?? res.data.nextBefore);
  }, [roomId]);

  const { typing, sendTyping, announceMessage } = useRoomRealtime(roomId, me.profile?.alias || me.profile?.club_username || 'Someone', load);

  useEffect(() => {
    setMessages(null);
    setOlder(null);
    void load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [messages?.length]);

  const loadOlder = async () => {
    if (!older) return;
    const res = await clubFetch(`/rooms/${roomId}/messages?before=${encodeURIComponent(older)}`);
    if (!res.ok) return;
    setMessages((m) => [...res.data.messages, ...(m || [])]);
    setOlder(res.data.nextBefore);
  };

  const send = async (imagePath?: string) => {
    if (sending.current || (!text.trim() && !imagePath)) return;
    sending.current = true;
    setBusy(true);
    setError('');
    const res = await clubFetch(`/rooms/${roomId}/messages`, { body: { body: text, image_path: imagePath } });
    sending.current = false;
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setText('');
    announceMessage();
    void load();
  };

  const attach = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    const up = await uploadMedia('chat', f);
    setBusy(false);
    if (!up.ok) return setError(up.error);
    await send(up.data.path);
  };

  return (
    <section aria-label={title} className="flex h-[calc(100dvh-11.5rem-env(safe-area-inset-bottom))] min-h-[380px] flex-col overflow-hidden rounded-[32px] border border-[#14261b]/[0.05] bg-[#f7f5ee] shadow-[0_20px_44px_-34px_rgba(20,38,27,0.6)] lg:h-[calc(100dvh-6.75rem)]">
      <header className="hidden items-center gap-3 border-b border-[#14261b]/[0.07] bg-[#fbfaf6] px-5 py-3 lg:flex">
        {peer ? <Avatar url={peer.avatar_url} name={peer.name} size={36} /> : <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e1efe3] text-[#3c6b2b]"><Globe aria-hidden="true" className="h-4 w-4" /></span>}
        <div className="min-w-0"><h2 className="truncate font-semibold">{title}</h2>{sub && <p className="text-xs text-[#14261b]/60">{sub}</p>}</div>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {older && <div className="text-center"><button type="button" onClick={loadOlder} className="text-xs font-semibold text-[#14261b]/70 underline hover:text-[#14261b]">Load earlier messages</button></div>}
        {messages === null && !error && <Spinner />}
        {messages?.map((m) => <MessageBubble key={m.id} m={m} onChanged={load} />)}
        {messages?.length === 0 && <p className="py-10 text-center text-sm text-[#14261b]/60">No messages yet. Say hi 👋</p>}
        <div ref={end} />
      </div>
      <div className="border-t border-[#14261b]/[0.07] bg-[#fbfaf6] p-3">
        {typing.length > 0 && <p className={`${styles.typing} mb-1 px-2 text-xs text-[#3c6b2b]`}>{typing.join(', ')} typing<span>.</span><span>.</span><span>.</span></p>}
        {error && <div className="mb-2"><Notice>{error}</Notice></div>}
        <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex items-end gap-2">
          <button type="button" onClick={() => file.current?.click()} aria-label="Attach a photo" className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#14261b]/15 text-[#14261b]/75 hover:bg-[#14261b]/[0.06] hover:text-[#14261b] ${FOCUS}`}><ImagePlus className="h-4 w-4" /></button>
          <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { void attach(e.target.files?.[0]); e.target.value = ''; }} />
          <textarea aria-label="Message" rows={1} maxLength={2000} className={`${field} max-h-32 min-h-11 resize-none rounded-2xl`} value={text} placeholder="Write a message"
            onChange={(e) => { setText(e.target.value); sendTyping(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }} />
          <button type="submit" disabled={busy || !text.trim()} aria-label="Send" className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#17301f] text-[#c8da4a] transition hover:bg-[#22432c] disabled:opacity-40 ${FOCUS}`}><Send className="h-4 w-4" /></button>
        </form>
      </div>
    </section>
  );
}
