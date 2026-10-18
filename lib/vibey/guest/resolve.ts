// The closed-world matcher: a phrase becomes one dish from this venue's menu, a short list to choose from, or "not on
// the menu". Nothing else can come out of it, so Vibey can never add a dish the venue does not serve.
import { rankDishes, type MenuDish } from './retrieve';

export type Resolution =
  | { status: 'ok'; dish: MenuDish; score: number }
  | { status: 'ambiguous'; options: MenuDish[] }
  | { status: 'none'; nearest: MenuDish[] };

/** A dish is chosen on its own only when it clearly leads: this score, and this much ahead of the next dish. */
export const ACCEPT = 0.75;
export const MARGIN = 0.15;
/** Below this a dish is not offered as an option at all. */
export const FLOOR = 0.45;

export function resolveMention(phrase: string, menu: MenuDish[]): Resolution {
  const ranked = rankDishes(phrase, menu, 6);
  if (!ranked.length) return { status: 'none', nearest: [] };

  const exact = ranked.filter((r) => r.exact);
  if (exact.length === 1) return { status: 'ok', dish: exact[0].dish, score: 1 };
  if (exact.length > 1) return { status: 'ambiguous', options: exact.slice(0, 3).map((r) => r.dish) };

  const [top, second] = ranked;
  if (top.score >= ACCEPT && (!second || top.score - second.score >= MARGIN)) {
    return { status: 'ok', dish: top.dish, score: top.score };
  }
  // Every word the guest said points at this dish and no other dish explains even half of them ("pasta" on a menu
  // with one pasta).
  if (top.mentionCover >= 0.99 && top.score >= 0.5 && (!second || second.mentionCover < 0.5)) {
    return { status: 'ok', dish: top.dish, score: top.score };
  }
  const options = ranked.filter((r) => r.score >= FLOOR).slice(0, 3);
  // One loose match ("paneer tikka" on a menu with only Paneer Paratha) is a near miss, not a choice between dishes.
  if (options.length === 1 && options[0].mentionCover < 0.99) return { status: 'none', nearest: [options[0].dish] };
  if (options.length) return { status: 'ambiguous', options: options.map((r) => r.dish) };
  return { status: 'none', nearest: ranked.slice(0, 3).map((r) => r.dish) };
}

/** Resolves against the dishes already in the tray first (for "remove the pasta"), then the whole menu. */
export function resolveInTray(phrase: string, menu: MenuDish[], trayIds: string[]): Resolution {
  const inTray = new Set(trayIds);
  const tray = menu.filter((d) => inTray.has(d.id));
  if (tray.length) {
    const r = resolveMention(phrase, tray);
    if (r.status !== 'none') return r;
  }
  return resolveMention(phrase, menu);
}
