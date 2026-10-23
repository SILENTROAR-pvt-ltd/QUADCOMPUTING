// The guest's tray as Vibey sees it: lines with menu names and prices, the total, and the tray after a set of changes.
// Prices always come from the menu, never from the phone; a line whose dish left the menu is skipped.
import { rupees } from '@/lib/guest/cashback';
import type { MenuDish } from './retrieve';
import type { GuestAction, GuestRequest } from './schema';

export type Tray = GuestRequest['tray'];
export interface TrayLine { dish: MenuDish; qty: number; amount: number }

export function trayLines(tray: Tray, menu: MenuDish[]): TrayLine[] {
  const byId = new Map(menu.map((d) => [d.id, d]));
  return tray.flatMap((l) => {
    const dish = byId.get(l.itemId);
    return dish ? [{ dish, qty: l.qty, amount: (Number(dish.price) || 0) * l.qty }] : [];
  });
}

export const trayTotal = (lines: TrayLine[]) => lines.reduce((s, l) => s + l.amount, 0);
export const dishCount = (lines: TrayLine[]) => lines.reduce((s, l) => s + l.qty, 0);

/** The tray once Vibey's changes are applied, the same way the phone applies them. */
export function applyActions(tray: Tray, actions: GuestAction[]): Tray {
  let next = tray.map((l) => ({ ...l }));
  for (const a of actions) {
    if (a.type === 'add') {
      const hit = next.find((l) => l.itemId === a.itemId);
      if (hit) hit.qty += a.qty; else next.push({ itemId: a.itemId, qty: a.qty });
    } else if (a.type === 'remove') {
      next = next.flatMap((l) => (l.itemId !== a.itemId ? [l] : a.qty && l.qty > a.qty ? [{ ...l, qty: l.qty - a.qty }] : []));
    } else if (a.type === 'set_qty') {
      next = next.map((l) => (l.itemId === a.itemId ? { ...l, qty: a.qty } : l));
    }
  }
  return next;
}

/** "Your tray: 3 dishes · ₹1,040." (nothing when the tray is empty). */
export function traySummary(tray: Tray, menu: MenuDish[]): string {
  const lines = trayLines(tray, menu);
  if (!lines.length) return '';
  const n = dishCount(lines);
  return `Your tray: ${n} ${n === 1 ? 'dish' : 'dishes'} · ${rupees(trayTotal(lines))}.`;
}
