// "Do you have margherita pizza?": the dish whose every name word the guest said, when exactly one dish fits and the other
// words only say what kind of dish it is ("pizza" for Margherita). Anything less certain stays a browse.
import { conceptsOf } from './concepts';
import { facetsOf } from './facets';
import { rankDishes, type MenuDish } from './retrieve';
import { bestTypedMatch, dishTokens } from './text';

export function namedDish(topic: string, menu: MenuDish[]): MenuDish | null {
  const said = dishTokens(topic);
  if (!said.length) return null;
  const full = rankDishes(topic, menu, 8).filter((s) => {
    const name = dishTokens(facetsOf(s.dish).family);
    if (!name.length || !name.every((w) => bestTypedMatch(w, said) >= 0.85)) return false;
    // Every word the guest said is either in the name or names the dish's kind.
    const kinds = facetsOf(s.dish).concepts;
    return said.every((w) => name.some((n) => bestTypedMatch(n, [w]) >= 0.85) || Array.from(conceptsOf(w)).some((c) => kinds.has(c)));
  });
  const families = new Set(full.map((s) => facetsOf(s.dish).family.toLowerCase()));
  // One dish, or one family whose sizes the order step will ask about.
  if (families.size !== 1 || !full.length) return null;
  return full.length === 1 ? full[0].dish : null;
}
