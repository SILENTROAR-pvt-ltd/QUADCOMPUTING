'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface Dish { id: string; name: string; price: number; category: string; description: string | null; image_url: string | null }

const DINE_TYPES = new Set(['food', 'beverage', 'drink']);

/** The venue's dishes (cached by the public catalog route) and the room's tray; an order is charged to the room. */
export function useRoomMenu(businessId: string | null, code: string, onPlaced: () => void) {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [tray, setTray] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const attempt = useRef<{ sig: string; key: string } | null>(null);

  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/guest/catalog?cafe_id=${encodeURIComponent(businessId)}`);
        const json = await res.json().catch(() => ({}));
        if (!alive) return;
        const items = (json.items || [])
          .filter((i: any) => i.is_available !== false && (!i.item_type || DINE_TYPES.has(String(i.item_type)) || !/room|accommodation|service|spa/i.test(String(i.category || ''))))
          .map((i: any) => ({ id: i.id, name: i.name, price: Number(i.price) || 0, category: i.category || 'Menu', description: i.description || null, image_url: i.image_url || null }));
        setDishes(items);
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [businessId]);

  const categories = useMemo(() => Array.from(new Set(dishes.map((d) => d.category))), [dishes]);
  const lines = useMemo(() => Object.entries(tray).map(([id, qty]) => ({ dish: dishes.find((d) => d.id === id)!, qty })).filter((l) => l.dish && l.qty > 0), [tray, dishes]);
  const total = lines.reduce((s, l) => s + l.dish.price * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  const add = (id: string, delta = 1) => setTray((t) => {
    const next = Math.max(0, Math.min(50, (t[id] || 0) + delta));
    const copy = { ...t };
    if (next === 0) delete copy[id]; else copy[id] = next;
    return copy;
  });
  const clear = () => setTray({});
  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const placeOrder = useCallback(async (): Promise<boolean> => {
    if (lines.length === 0 || placing) return false;
    setPlacing(true);
    try {
      const items = lines.map((l) => ({ item_id: l.dish.id, quantity: l.qty }));
      // One key per distinct tray, kept across retries, so a slow tap never sends the kitchen the same dishes twice.
      const sig = JSON.stringify(items);
      if (!attempt.current || attempt.current.sig !== sig) attempt.current = { sig, key: `rs-${Math.random().toString(36).slice(2, 14)}` };
      const res = await fetch(`/api/guest/room/${encodeURIComponent(code)}/order`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, note: note || null, idempotency_key: attempt.current.key }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) { flash(json.error || 'The kitchen could not take the order.'); return false; }
      attempt.current = null;
      clear(); setNote('');
      flash('Sent to the kitchen · charged to your room');
      onPlaced();
      return true;
    } catch { flash('Network error. Tap again; it will not be sent twice.'); return false; }
    finally { setPlacing(false); }
  }, [lines, placing, code, note, onPlaced]);

  return { dishes, categories, loading, tray, lines, total, count, add, clear, note, setNote, placing, placeOrder, toast };
}
