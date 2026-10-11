'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Send } from 'lucide-react';
import { Button, Notice, Spinner, field } from '../ui';
import { clubFetch, uploadMedia } from '../api';
import { useClub } from '../club-context';
import { MessageBubble, type ChatMessage } from './MessageBubble';
import { useRoomRealtime } from './useRoomRealtime';
import styles from '../club.module.css';

/** One chat room: newest messages, older pages on demand, photo upload, reactions and typing. */
export function ChatRoom({ roomId, title }: { roomId: string; title: string }) {
  const { me } = useClub();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [older, setOlder] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
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

  const { typing, sendTyping, announceMessage } = useRoomRealtime(roomId, me.profile?.alias || me.viberId || 'Someone', load);

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
    if (!text.trim() && !imagePath) return;
    setBusy(true);
    setError('');
    const res = await clubFetch(`/rooms/${roomId}/messages`, { body: { body: text, image_path: imagePath } });
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
    <section aria-label={title} className="flex h-[calc(100dvh-11rem)] min-h-[420px] flex-col rounded-3xl border border-[#2a1250]/10 bg-[#fbf8f3]">
      <header className="border-b border-[#2a1250]/[0.07] px-5 py-3"><h2 className="font-semibold">{title}</h2></header>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {older && <div className="text-center"><button type="button" onClick={loadOlder} className="text-xs font-semibold text-[#2a1250]/60 underline">Load earlier messages</button></div>}
        {messages === null && !error && <Spinner />}
        {messages?.map((m) => <MessageBubble key={m.id} m={m} onChanged={load} />)}
        {messages?.length === 0 && <p className="py-10 text-center text-sm text-[#2a1250]/50">No messages yet. Say hi.</p>}
        <div ref={end} />
      </div>
      <div className="border-t border-[#2a1250]/[0.07] p-3">
        {typing.length > 0 && <p className={`${styles.typing} mb-1 px-2 text-xs text-[#2a1250]/55`}>{typing.join(', ')} typing<span>.</span><span>.</span><span>.</span></p>}
        {error && <div className="mb-2"><Notice>{error}</Notice></div>}
        <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex items-end gap-2">
          <button type="button" onClick={() => file.current?.click()} aria-label="Attach a photo" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#2a1250]/15 bg-white text-[#2a1250]/70"><ImagePlus className="h-4 w-4" /></button>
          <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { void attach(e.target.files?.[0]); e.target.value = ''; }} />
          <textarea aria-label="Message" rows={1} maxLength={2000} className={`${field} max-h-32 min-h-10 resize-none`} value={text} placeholder="Write a message"
            onChange={(e) => { setText(e.target.value); sendTyping(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }} />
          <Button type="submit" busy={busy} aria-label="Send" className="h-10 w-10 shrink-0 !px-0"><Send className="h-4 w-4" /></Button>
        </form>
      </div>
    </section>
  );
}
