'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FOCUS } from '../ui';
import { TABS, isActive } from './nav-items';

/** The phone and tablet tab bar: a floating forest-green pill; the open tab glows chartreuse. */
export function BottomTabs() {
  const path = usePathname() || '';
  return (
    <nav aria-label="Club" className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <ul className="mx-auto grid h-[68px] max-w-md grid-cols-5 rounded-full bg-[#17301f] px-1.5 shadow-[0_20px_40px_-16px_rgba(23,48,31,0.75)]">
        {TABS.map((item) => {
          const on = isActive(path, item);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex">
              <Link href={item.href} aria-current={on ? 'page' : undefined}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[9.5px] font-semibold tracking-wide transition ${on ? 'text-[#c8da4a]' : 'text-[#f6f4ec]/70 hover:text-[#f6f4ec]'} ${FOCUS}`}>
                <span className={`grid h-8 w-8 place-items-center rounded-full transition ${on ? 'bg-[#c8da4a] text-[#17301f]' : ''}`}>
                  <Icon aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={on ? 2.25 : 1.75} />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
