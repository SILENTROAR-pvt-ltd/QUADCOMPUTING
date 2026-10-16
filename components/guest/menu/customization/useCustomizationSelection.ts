'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CartAddon } from '@/lib/store/cart.store';
import { getItemCustomizationGroups, type CustomizableItem, type CustomizationOption } from './customization.types';

/**
 * What the guest has chosen for one dish: a single pick per "choose one" group (the default, or the first, to start
 * with), any number from "choose many" groups, a note, and how many. Everything is local, so every tap answers at once.
 * The price is worked out here and only sent when the dish is added.
 */
export function useCustomizationSelection(item: CustomizableItem | null, isOpen: boolean) {
  const [singles, setSingles] = useState<Record<string, CustomizationOption>>({});
  const [multiples, setMultiples] = useState<Record<string, CustomizationOption[]>>({});
  const [instructions, setInstructions] = useState('');
  const [quantity, setQuantity] = useState(1);

  const groups = useMemo(() => (item ? getItemCustomizationGroups(item) : []), [item]);

  // A dish opens with its defaults, a clean note and a quantity of one.
  useEffect(() => {
    if (!item || !isOpen) return;
    const s: Record<string, CustomizationOption> = {};
    const m: Record<string, CustomizationOption[]> = {};
    for (const g of getItemCustomizationGroups(item)) {
      if (g.type === 'single') {
        const first = g.options.find((o) => o.is_default) || g.options[0];
        if (first) s[g.id] = first;
      } else {
        m[g.id] = [];
      }
    }
    setSingles(s);
    setMultiples(m);
    setInstructions('');
    setQuantity(1);
  }, [item, isOpen]);

  const satisfied = useMemo(() => groups.every((g) => !(g.required && g.type === 'single') || Boolean(singles[g.id])), [groups, singles]);

  const addons = useMemo<CartAddon[]>(() => {
    const list: CartAddon[] = [];
    Object.values(singles).forEach((o) => { if (o && o.price > 0) list.push({ name: o.name, price: o.price }); });
    Object.values(multiples).forEach((opts) => opts.forEach((o) => list.push({ name: o.name, price: o.price })));
    return list;
  }, [singles, multiples]);

  const unitPrice = (item ? Number(item.price) : 0) + addons.reduce((sum, a) => sum + a.price, 0);

  return {
    groups, singles, multiples, instructions, setInstructions, quantity, setQuantity, satisfied, addons, unitPrice,
    total: unitPrice * quantity,
    pickSingle: (groupId: string, option: CustomizationOption) => setSingles((prev) => ({ ...prev, [groupId]: option })),
    toggleMultiple: (groupId: string, option: CustomizationOption) => setMultiples((prev) => {
      const current = prev[groupId] || [];
      const has = current.some((o) => o.id === option.id);
      return { ...prev, [groupId]: has ? current.filter((o) => o.id !== option.id) : [...current, option] };
    }),
  };
}
