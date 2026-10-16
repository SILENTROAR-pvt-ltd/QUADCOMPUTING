'use client';

import React, { useState } from 'react';
import { CalendarDays, Truck } from 'lucide-react';
import { MenuHeader } from '@/components/guest/menu/MenuHeader';
import { RecipeCubeCard } from '@/components/guest/menu/RecipeCubeCard';
import { FloatingCartBar } from '@/components/guest/menu/FloatingCartBar';
import { guestDishes } from '@/lib/showcase/demo-extras';
import { DEMO_VENUE } from '@/lib/showcase/demo-orders';

// The two small buttons under the menu header, with the guest menu's own markup (the live ones read the venue's settings).
const Entry = ({ Icon, title, detail }: { Icon: typeof Truck; title: string; detail: string }) => (
  <span className="flex w-full items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-zinc-200/70">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100"><Icon className="h-4 w-4 text-zinc-900" aria-hidden /></span>
    <span className="min-w-0">
      <span className="block truncate text-[13px] font-semibold text-zinc-900">{title}</span>
      <span className="block truncate text-[11px] text-zinc-500">{detail}</span>
    </span>
  </span>
);

/** The guest menu with a working tray: tapping + adds the dish and the tray bar counts it, as on the live menu. */
export function GuestMenuScreen() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const change = (id: string, by: number) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + by) }));
  const count = Object.values(cart).reduce((a, n) => a + n, 0);
  const subtotal = guestDishes.reduce((a, d) => a + d.price * (cart[d.id] ?? 0), 0);

  return (
    <div className="min-h-screen bg-white pb-36">
      <MenuHeader guestName="Aanya Mehra" venueName={DEMO_VENUE.name} tagline="Slow coffee, all-day plates" tableNo="T-04" />
      <div className="grid grid-cols-2 gap-2 px-4">
        <Entry Icon={Truck} title="Order for delivery" detail="Within 5 km" />
        <Entry Icon={CalendarDays} title="Reserve a table" detail="Open until 11 PM" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 px-4">
        {guestDishes.map((d) => (
          <RecipeCubeCard key={d.id} item={d} cartQuantity={cart[d.id] ?? 0} priority
            onIncrement={() => change(d.id, 1)} onDecrement={() => change(d.id, -1)} />
        ))}
      </div>
      {count > 0 && <FloatingCartBar totalCartCount={count} cartSubtotal={subtotal} tableNumber="T-04" onOpenCartReview={() => undefined} />}
    </div>
  );
}
