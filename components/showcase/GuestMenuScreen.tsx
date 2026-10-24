'use client';

import React, { useMemo, useState } from 'react';
import { MenuHeader } from '@/components/guest/menu/MenuHeader';
import { MenuJourneySteps } from '@/components/guest/menu/MenuJourneySteps';
import { HostTopPicks } from '@/components/guest/menu/HostTopPicks';
import { MenuCategorySection } from '@/components/guest/menu/MenuCategorySection';
import { RecipeCubeCard } from '@/components/guest/menu/RecipeCubeCard';
import { DISH_GRID } from '@/components/guest/menu/DiningFeedStates';
import { FloatingCartBar } from '@/components/guest/menu/FloatingCartBar';
import { MemoryVault } from '@/components/guest/menu/vault/MemoryVault';
import { bannerPhotos } from '@/components/guest/menu/hero/banner-photos';
import { LUXE_FONT_VAR } from '@/components/guest/luxe/luxe-theme';
import type { MenuItem } from '@/components/guest/menu/types';
import { guestDishes, guestGallery } from '@/lib/showcase/demo-extras';
import { DEMO_VENUE } from '@/lib/showcase/demo-orders';

const MENU: MenuItem[] = guestDishes;
const FEATURED = ['g6', 'g3', 'g5', 'g2'];
const CATEGORIES = ['Coffee', 'Breakfast', 'Mains'];

/**
 * The guest menu as guests see it now, from its real parts with the sample café's dishes: the banner over the venue's own
 * photos, the journey steps, the house's top picks, category bars that open to dish cubes, the memory vault, and a working
 * tray (tapping + adds the dish and the tray bar counts it). Nothing is sent anywhere.
 */
export function GuestMenuScreen() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [open, setOpen] = useState<Set<string>>(() => new Set(['Coffee']));
  const change = (item: MenuItem, by: number) => setCart((c) => ({ ...c, [item.id]: Math.max(0, (c[item.id] ?? 0) + by) }));
  const count = Object.values(cart).reduce((a, n) => a + n, 0);
  const subtotal = MENU.reduce((a, d) => a + d.price * (cart[d.id] ?? 0), 0);
  const photos = useMemo(() => bannerPhotos(MENU, FEATURED), []);
  const toggle = (c: string) => setOpen((s) => { const next = new Set(s); if (next.has(c)) next.delete(c); else next.add(c); return next; });

  return (
    <div className={`${LUXE_FONT_VAR} min-h-screen bg-[#f5f1e8] pb-36 font-sans text-[#10231a]`}>
      <MenuHeader guestName="Aanya Mehra" venueName={DEMO_VENUE.name} tagline="Slow coffee, all-day plates" tableNo="T-04" photos={photos} />
      <div className="flex justify-center px-4 pb-2.5 pt-3"><MenuJourneySteps cartCount={count} sentCount={0} /></div>
      <main className="space-y-5 px-4 pt-2">
        <HostTopPicks featured={FEATURED} items={MENU} getItemCartQuantity={(id) => cart[id] ?? 0} onAdd={(i) => change(i, 1)} />
        <div className="space-y-3">
          {CATEGORIES.map((c) => {
            const list = MENU.filter((d) => d.category === c);
            return (
              <MenuCategorySection key={c} title={c} count={list.length} image={list[0]?.image_url ?? null} open={open.has(c)} onToggle={() => toggle(c)}>
                <div className={DISH_GRID}>
                  {list.map((d) => (
                    <RecipeCubeCard key={d.id} item={d} cartQuantity={cart[d.id] ?? 0} priority onIncrement={(i) => change(i, 1)} onDecrement={(i) => change(i, -1)} />
                  ))}
                </div>
              </MenuCategorySection>
            );
          })}
        </div>
        <MemoryVault gallery={guestGallery} venueName={DEMO_VENUE.name} />
      </main>
      {count > 0 && <FloatingCartBar totalCartCount={count} cartSubtotal={subtotal} tableNumber="T-04" onOpenCartReview={() => undefined} />}
    </div>
  );
}
