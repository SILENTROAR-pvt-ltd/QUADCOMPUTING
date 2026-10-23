'use client';

// Applies Vibey's proposed tray changes to the guest's own cart, using the guest's own menu for names and prices. A dish
// with options is never added blind: it is handed back so the customisation drawer can open. Nothing here orders.
import { useCartStore, type CartItem } from '@/lib/store/cart.store';
import type { MenuItem } from '@/components/guest/menu/types';
import type { GuestAction, StaffReason } from '@/lib/vibey/guest/schema';

export interface Applied {
  /** What changed, one line per dish, for the receipt. */
  lines: string[];
  needsOptions: MenuItem[];
  openTray: boolean;
  staff: StaffReason | null;
  /** The tray before and after, for Undo. */
  before: CartItem[];
  after: string;
}

export const hasOptions = (i: MenuItem) =>
  Boolean(i.item_options?.length || i.options?.length || i.customization_groups?.length);

const cart = () => useCartStore.getState();
const linesOf = (itemId: string) => cart().items.filter((c) => c.item_id === itemId);

function changeQty(itemId: string, by: number) {
  for (let i = 0; i < Math.abs(by); i += 1) {
    const last = linesOf(itemId).pop();
    if (!last) return;
    if (by > 0) cart().incrementQuantity(last.cart_id); else cart().decrementQuantity(last.cart_id);
  }
}

export function applyActions(actions: GuestAction[], menu: MenuItem[]): Applied {
  const byId = new Map(menu.map((i) => [i.id, i]));
  const before = cart().items.map((i) => ({ ...i, selected_addons: [...i.selected_addons] }));
  const out: Applied = { lines: [], needsOptions: [], openTray: false, staff: null, before, after: '' };
  for (const a of actions) {
    if (a.type === 'open_tray') { out.openTray = true; continue; }
    if (a.type === 'call_staff') { out.staff = a.reason; continue; }
    const item = byId.get(a.itemId);
    if (!item) continue;
    if (a.type === 'add') {
      if (hasOptions(item)) { out.needsOptions.push(item); continue; }
      const price = Number(item.price) || 0;
      cart().addToCart({
        item_id: item.id, name: item.name, base_price: price, quantity: a.qty, selected_addons: [], total_item_price: price,
        image_url: item.image_url, category: item.category, notes: a.note,
      });
      out.lines.push(`Added ${a.qty} × ${item.name}${a.note ? ` (${a.note})` : ''}`);
    } else if (a.type === 'remove') {
      const lines = linesOf(item.id);
      if (!lines.length) continue;
      if (a.qty) changeQty(item.id, -a.qty); else lines.forEach((l) => cart().removeFromCart(l.cart_id));
      out.lines.push(a.qty ? `Removed ${a.qty} × ${item.name}` : `Removed ${item.name}`);
    } else if (a.type === 'set_qty') {
      const have = linesOf(item.id).reduce((s, l) => s + l.quantity, 0);
      if (have === 0) continue;
      changeQty(item.id, a.qty - have);
      out.lines.push(`${item.name} now ${a.qty}`);
    }
  }
  out.after = JSON.stringify(cart().items);
  return out;
}

/** Puts the tray back as it was before Vibey's change, but only if nothing else changed it since. */
export function undoApplied(applied: Pick<Applied, 'before' | 'after'>): boolean {
  if (JSON.stringify(cart().items) !== applied.after) return false;
  cart().clearCart();
  applied.before.forEach((i) => cart().addToCart({ ...i }));
  return true;
}

/** The tray as Vibey sees it: dish ids and quantities only, in the order they were added. */
export function trayForVibey(): Array<{ itemId: string; qty: number }> {
  const qty = new Map<string, number>();
  for (const c of cart().items) qty.set(c.item_id, (qty.get(c.item_id) ?? 0) + c.quantity);
  return Array.from(qty.entries()).slice(0, 40).map(([itemId, q]) => ({ itemId, qty: Math.min(99, q) }));
}
