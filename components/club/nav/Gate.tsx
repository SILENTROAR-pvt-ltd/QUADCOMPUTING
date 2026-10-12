'use client';

import React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { CLUB_DISPLAY } from '../fonts';
import { Card } from '../ui';
import { LivePhotos } from '../LivePhotos';
import { SLIDESHOW } from '../photos';
import { Brand } from './Brand';
import styles from '../club.module.css';

/**
 * The frame around everything before you are in (signing in, applying, waiting for review): live
 * travel photography on one side, the form on the other (stacked on phones).
 */
export function Gate({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="p-3 lg:sticky lg:top-0 lg:h-dvh lg:p-4">
        <LivePhotos photos={SLIDESHOW} dots className="h-64 rounded-[32px] sm:h-80 lg:h-full">
          {(p) => (
            <>
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/60" />
              <div className="absolute left-5 top-5"><Brand href="/join" tone="light" /></div>
              <div key={p.id} className={`${styles.captionIn} absolute inset-x-6 bottom-12 text-white lg:bottom-16 lg:left-10`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/85">{p.country}</p>
                <p className={`${CLUB_DISPLAY} mt-1 text-[30px] font-semibold leading-tight lg:text-6xl`}>{p.place}</p>
                <p className="mt-3 hidden max-w-sm text-[15px] text-white/85 lg:block">Travel with people who are actually there. Verified members, real plans, stays held safely in escrow.</p>
              </div>
            </>
          )}
        </LivePhotos>
      </div>
      <main className="px-4 pb-14 pt-2 sm:px-8 lg:flex lg:min-h-dvh lg:flex-col lg:justify-center lg:py-12">
        <div className="mb-6 flex justify-end">
          {aside ?? <Link href="/join" className="text-sm font-semibold text-[#14261b]/70 underline-offset-4 hover:text-[#14261b] hover:underline">About the club</Link>}
        </div>
        {children}
      </main>
    </div>
  );
}

/** A centred card with a soft icon and an editorial title. */
export function StatusCard({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <Card className="mx-auto max-w-lg text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e1efe3] text-[#2f5d1f]"><Icon aria-hidden="true" className="h-7 w-7" /></span>
      <h1 className={`${CLUB_DISPLAY} mt-4 text-[32px] font-semibold leading-tight`}>{title}</h1>
      <div className="mt-3 space-y-4 text-sm text-[#14261b]/70">{children}</div>
    </Card>
  );
}
