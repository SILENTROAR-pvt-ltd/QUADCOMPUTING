'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { VibeySheet } from '@/components/guest/vibey/VibeySheet';
import { applyActions } from '@/components/guest/vibey/apply-actions';
import type { VibeyMsg } from '@/components/guest/vibey/useVibeyGuest';
import type { VibeyGuestReply } from '@/lib/vibey/guest/schema';
import type { MenuItem } from '@/components/guest/menu/types';
import { useCartStore } from '@/lib/store/cart.store';
import { guestDishes } from '@/lib/showcase/demo-extras';
import { DEMO_VENUE } from '@/lib/showcase/demo-orders';
import { GuestMenuScreen } from './GuestMenuScreen';

const MENU: MenuItem[] = guestDishes;
const STEPS = ['read', 'retrieve', 'fastpath', 'respond'];
const STEP_MS = 420;

/** The one exchange the recording plays: the guest asks for coffee and something to share, Vibey fills the tray. */
const ANSWER: VibeyGuestReply = {
  reply: 'Done, two Cappuccinos are in. For sharing, these are tonight’s table favourites.',
  actions: [{ type: 'add', itemId: 'g1', qty: 2 }],
  cards: [{ itemId: 'g6' }, { itemId: 'g5' }, { itemId: 'g3' }],
  chips: ['Add a dessert', 'Less spicy', 'Show drinks'],
  meta: { path: 'fastpath', ms: 380, intent: 'order' },
};

/**
 * Vibey, the guest's ordering chat, over the menu: the real sheet, messages, live steps and dish tiles, with the reply
 * scripted instead of asked (nothing reaches the model). The tray is the real cart store, filled by the real applyActions.
 */
export function VibeyScreen() {
  const items = useCartStore((s) => s.items);
  const [messages, setMessages] = useState<VibeyMsg[]>([]);
  const [sending, setSending] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);

  useEffect(() => { useCartStore.setState({ items: [] }); }, []);

  const send = useCallback(async (text: string) => {
    setMessages((ms) => [...ms, { id: `g${ms.length}`, role: 'guest', text }]);
    setSending(true);
    setSteps([STEPS[0]]);
    STEPS.slice(1).forEach((step, i) => setTimeout(() => setSteps((s) => [...s, step]), STEP_MS * (i + 1)));
    setTimeout(() => {
      const applied = applyActions(ANSWER.actions, MENU);
      setSending(false);
      setSteps([]);
      setMessages((ms) => [...ms, { id: `v${ms.length}`, role: 'vibey', text: ANSWER.reply, reply: ANSWER,
        applied: { lines: applied.lines, before: applied.before, after: applied.after } }]);
    }, STEP_MS * STEPS.length);
  }, []);

  const chat = useMemo(() => ({
    status: { enabled: true, simple: false }, messages, sending, steps, send,
    undo: () => undefined, callStaff: async () => undefined,
  }), [messages, sending, steps, send]);

  const quantityOf = (id: string) => items.filter((i) => i.item_id === id).reduce((a, i) => a + i.quantity, 0);
  const increment = (item: MenuItem) => useCartStore.getState().addToCart({
    item_id: item.id, name: item.name, base_price: item.price, quantity: 1, selected_addons: [], total_item_price: item.price, image_url: item.image_url, category: item.category,
  });
  const decrement = (item: MenuItem) => {
    const line = useCartStore.getState().items.find((i) => i.item_id === item.id);
    if (line) useCartStore.getState().decrementQuantity(line.cart_id);
  };

  return (
    <>
      <GuestMenuScreen />
      <VibeySheet chat={chat} venueName={DEMO_VENUE.name} tableNumber="T-04" menu={MENU} quantityOf={quantityOf}
        onIncrement={increment} onDecrement={decrement} onOpenTray={() => undefined} onClose={() => undefined} />
    </>
  );
}
