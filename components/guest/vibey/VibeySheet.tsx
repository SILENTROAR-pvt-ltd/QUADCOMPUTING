'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Maximize2, Minimize2, ShoppingBag, X } from 'lucide-react';
import { BottomSheet } from '@/components/guest/shared/BottomSheet';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import { useCartStore } from '@/lib/store/cart.store';
import { rupees } from '@/lib/guest/cashback';
import type { MenuItem } from '@/components/guest/menu/types';
import { VibeyAvatar } from './VibeyAvatar';
import { VibeyMessage } from './VibeyMessage';
import { VibeyComposer } from './VibeyComposer';
import { VibeyThinking } from './VibeyThinking';
import { VibeyWelcome } from './VibeyWelcome';
import type { useVibeyGuest } from './useVibeyGuest';

interface VibeySheetProps {
  chat: ReturnType<typeof useVibeyGuest>;
  venueName: string;
  tableNumber: string;
  menu: MenuItem[];
  quantityOf: (itemId: string) => number;
  onIncrement: (item: MenuItem) => void;
  onDecrement: (item: MenuItem) => void;
  onOpenTray: () => void;
  onClose: () => void;
}

const ICON_BTN = 'grid h-10 w-10 cursor-pointer place-items-center rounded-full text-[#8a6d3f] transition-colors hover:bg-[#efe7d6] hover:text-[#10231a]';

/** The chat on ivory paper: a soft gold glow, the mascot, live progress in gold, and the forest tray button. Full screen on demand. */
export function VibeySheet({ chat, venueName, tableNumber, menu, quantityOf, onIncrement, onDecrement, onOpenTray, onClose }: VibeySheetProps) {
  const [full, setFull] = useState(false);
  const feed = useRef<HTMLDivElement | null>(null);
  const content = useRef<HTMLDivElement | null>(null);
  const box = useRef<HTMLDivElement | null>(null);
  // Follows the conversation down while the guest is at the bottom; leaves them be once they scroll up to reread.
  const stick = useRef(true);
  const lastTop = useRef(0);
  const menuById = useMemo(() => new Map(menu.map((i) => [i.id, i])), [menu]);
  const count = useCartStore((s) => s.getTotalCount());
  const subtotal = useCartStore((s) => s.getSubtotal());
  const empty = chat.messages.length === 0 && !chat.sending;
  const lastVibey = [...chat.messages].reverse().find((m) => m.role === 'vibey');
  const lastIsVibey = chat.messages[chat.messages.length - 1]?.role === 'vibey';

  useEffect(() => { stick.current = true; feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: 'smooth' }); }, [chat.messages.length, chat.steps.length]);
  useEffect(() => {
    const f = feed.current;
    if (!f || !content.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => { if (stick.current) f.scrollTop = f.scrollHeight; });
    ro.observe(content.current);
    return () => ro.disconnect();
  }, [empty]);

  // Keep keyboard focus inside the chat while it is open.
  const trap = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !box.current) return;
    const f = Array.from(box.current.querySelectorAll<HTMLElement>('button:not([disabled]), input, [href]'));
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  };

  return (
    <BottomSheet labelledBy="vibey-title" onClose={onClose} full={full}
      decor={<div className={`vibey-glow ${chat.sending ? 'vibey-glow-hot' : 'vibey-glow-calm'}`} />}>
      <div ref={box} onKeyDown={trap} className={`mx-auto flex w-full flex-col gap-3 ${full ? 'h-full max-w-2xl' : 'h-[86dvh] max-h-[800px]'}`}>
        <header className="flex shrink-0 items-center gap-3">
          <VibeyAvatar size={42} mood={chat.sending ? 'thinking' : 'still'} online />
          <div className="min-w-0 flex-1">
            <h2 id="vibey-title" style={LUXE_SERIF} className="text-[24px] font-semibold leading-none text-[#10231a]">Vibey</h2>
            <p className="mt-1 truncate text-[11.5px] text-[#8a7d62]">
              {chat.sending ? <span className="shimmer-text font-medium">Vibing on it…</span> : `${venueName} · Table ${tableNumber}`}
            </p>
          </div>
          <button type="button" onClick={() => setFull((v) => !v)} aria-label={full ? 'Exit full screen' : 'Open full screen'} aria-pressed={full} className={ICON_BTN}>
            {full ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button type="button" onClick={onClose} aria-label="Close" className={ICON_BTN}><X className="h-4 w-4" /></button>
        </header>
        <div aria-hidden className={`relative h-[1.5px] shrink-0 overflow-hidden bg-gradient-to-r from-transparent via-[#e2d3b3] to-transparent ${chat.sending ? 'vibey-progress' : ''}`} />

        {chat.status.simple && <p className="shrink-0 rounded-xl border border-[#e8dfcc] bg-[#f5efe2] px-3 py-2 text-[12.5px] text-[#6b5530]">It’s a busy time, so short orders work best, like &quot;2 cold coffee&quot;.</p>}

        {empty ? (
          <VibeyWelcome venueName={venueName} onPick={chat.send} />
        ) : (
          <div ref={feed} aria-live="polite" onScroll={(e) => {
            // Only the guest scrolling up lets go; the feed's own smooth scrolling only ever moves down.
            const f = e.currentTarget;
            if (f.scrollHeight - f.scrollTop - f.clientHeight < 80) stick.current = true;
            else if (f.scrollTop < lastTop.current - 4) stick.current = false;
            lastTop.current = f.scrollTop;
          }}
            className="no-scrollbar -mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-1">
            <div ref={content} className="flex flex-col gap-5 pb-1">
              {chat.messages.map((m) => (
                <VibeyMessage key={m.id} msg={m} typing={m.id === chat.typingId} onTyped={chat.doneTyping}
                  showChips={lastIsVibey && m === lastVibey && !chat.sending} sending={chat.sending} onChip={chat.send}
                  menuById={menuById} quantityOf={quantityOf} onIncrement={onIncrement} onDecrement={onDecrement} onUndo={chat.undo} onCallStaff={chat.callStaff} />
              ))}
              {chat.sending && <VibeyThinking steps={chat.steps} />}
            </div>
          </div>
        )}

        {count > 0 && (
          <motion.button type="button" onClick={onOpenTray} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex h-12 w-full shrink-0 cursor-pointer items-center justify-between rounded-2xl bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] px-4 text-[13px] font-semibold text-[#f5f1e8] shadow-[0_14px_28px_-16px_rgba(15,42,30,0.85)] ring-1 ring-[#d9c193]/30">
            <span className="flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-[#e6cf9c]" aria-hidden /> {count} {count === 1 ? 'item' : 'items'} · {rupees(subtotal)}</span>
            <span className="flex items-center gap-1 text-[#e6cf9c]">Review &amp; place order <ArrowRight className="h-4 w-4" aria-hidden /></span>
          </motion.button>
        )}
        <VibeyComposer sending={chat.sending} onSend={chat.send} />
      </div>
    </BottomSheet>
  );
}
