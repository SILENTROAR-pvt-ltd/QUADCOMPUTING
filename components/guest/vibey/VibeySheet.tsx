'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minimize2, ShoppingBag, X } from 'lucide-react';
import { BottomSheet } from '@/components/guest/shared/BottomSheet';
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

const STARTERS = ["What's popular?", 'Show drinks', 'Show desserts'];
const ICON_BTN = 'grid h-10 w-10 cursor-pointer place-items-center rounded-full text-zinc-500 transition-colors hover:bg-black/5 hover:text-zinc-900';

/** The chat: an ambient glow, the mascot, live progress, and a composer card. Full screen on demand. */
export function VibeySheet({ chat, venueName, tableNumber, menu, quantityOf, onIncrement, onDecrement, onOpenTray, onClose }: VibeySheetProps) {
  const [full, setFull] = useState(false);
  const feed = useRef<HTMLDivElement | null>(null);
  const box = useRef<HTMLDivElement | null>(null);
  const menuById = useMemo(() => new Map(menu.map((i) => [i.id, i])), [menu]);
  const count = useCartStore((s) => s.getTotalCount());
  const subtotal = useCartStore((s) => s.getSubtotal());
  const empty = chat.messages.length === 0 && !chat.sending;
  const last = chat.messages[chat.messages.length - 1];
  const chips = last?.reply?.chips ?? STARTERS;

  useEffect(() => { feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: 'smooth' }); }, [chat.messages.length, chat.steps.length]);

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
          <VibeyAvatar size={40} mood={chat.sending ? 'thinking' : 'still'} online />
          <div className="min-w-0 flex-1">
            <h2 id="vibey-title" className="text-[17px] font-semibold leading-tight text-zinc-950">Vibey</h2>
            <p className="truncate text-[12px] text-zinc-500">{chat.sending ? 'Working on it…' : `${venueName} · Table ${tableNumber}`}</p>
          </div>
          <button type="button" onClick={() => setFull((v) => !v)} aria-label={full ? 'Exit full screen' : 'Open full screen'} aria-pressed={full} className={ICON_BTN}>
            {full ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button type="button" onClick={onClose} aria-label="Close" className={ICON_BTN}><X className="h-4 w-4" /></button>
        </header>
        <div aria-hidden className={`relative h-[2px] shrink-0 overflow-hidden rounded-full bg-black/[0.04] ${chat.sending ? 'vibey-progress' : ''}`} />

        {chat.status.simple && <p className="shrink-0 rounded-xl bg-amber-50/90 px-3 py-2 text-[12.5px] text-amber-900">It’s a busy time, so short orders work best, like &quot;2 cold coffee&quot;.</p>}

        {empty ? (
          <VibeyWelcome venueName={venueName} onPick={chat.send} />
        ) : (
          <div ref={feed} aria-live="polite" className="no-scrollbar -mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-1 py-1">
            {chat.messages.map((m) => (
              <VibeyMessage key={m.id} msg={m} menuById={menuById} quantityOf={quantityOf} onIncrement={onIncrement}
                onDecrement={onDecrement} onUndo={chat.undo} onCallStaff={chat.callStaff} />
            ))}
            {chat.sending && <VibeyThinking steps={chat.steps} />}
          </div>
        )}

        {count > 0 && (
          <button type="button" onClick={onOpenTray}
            className="flex h-11 w-full shrink-0 cursor-pointer items-center justify-between rounded-2xl bg-gradient-to-r from-zinc-950 to-zinc-800 px-4 text-[13px] font-semibold text-white shadow-[0_12px_26px_-14px_rgba(24,24,27,0.8)] hover:to-zinc-700">
            <span className="flex items-center gap-2"><ShoppingBag className="h-4 w-4" aria-hidden /> {count} {count === 1 ? 'item' : 'items'} · {rupees(subtotal)}</span>
            <span>Review &amp; place order</span>
          </button>
        )}
        <VibeyComposer chips={chips} sending={chat.sending} onSend={chat.send} />
      </div>
    </BottomSheet>
  );
}
