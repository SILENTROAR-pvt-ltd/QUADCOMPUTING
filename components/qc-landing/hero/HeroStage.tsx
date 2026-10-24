'use client';

import React from 'react';
import { CalendarHeart, ChefHat, LineChart, ReceiptText } from 'lucide-react';
import { VIDEOS, type VideoId } from '@/lib/landing/videos';
import { useAutoStep } from '../useAutoStep';
import { StageVideo } from '../StageVideo';
import s from '@/components/vibers/luxe.module.css';

const TABS: { id: VideoId; label: string; url: string; icon: typeof ReceiptText; ms: number }[] = [
  { id: 'pos-billing', label: 'Billing', url: 'Control centre · Billing & tables', icon: ReceiptText, ms: 12000 },
  { id: 'kitchen-board', label: 'Kitchen', url: 'Control centre · Live kitchen', icon: ChefHat, ms: 12000 },
  { id: 'host-events', label: 'Events', url: 'Control centre · My guests & events', icon: CalendarHeart, ms: 18000 },
  { id: 'overview', label: 'Analytics', url: 'Control centre · Analytics & COGS', icon: LineChart, ms: 11000 },
];

/**
 * The hero's product window: real recordings of the control centre (billing, the kitchen board, events, analytics) that
 * take turns, a gold bar under each tab showing the time left. Picking a tab holds it there.
 */
export function HeroStage() {
  const { ref, active, choose, running, inView, calm } = useAutoStep(TABS.length, (i) => TABS[i].ms, 0.2);
  const tab = TABS[active];
  const ratio = VIDEOS[tab.id].width / VIDEOS[tab.id].height;

  return (
    <div ref={ref}>
      <div role="tablist" aria-label="Control centre screens" className="mb-3 grid grid-cols-4 gap-2">
        {TABS.map((t, i) => (
          <button key={t.id} type="button" role="tab" aria-selected={i === active} onClick={() => choose(i)}
            className="group text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d9c193]">
            <span className={`flex items-center gap-2 text-[12px] font-semibold tracking-[0.04em] transition-colors ${i === active ? 'text-[#f6f3ec]' : 'text-[#f6f3ec]/45 group-hover:text-[#f6f3ec]/75'}`}>
              <t.icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{t.label}</span>
            </span>
            <span aria-hidden="true" className="mt-2 block h-[2px] overflow-hidden bg-[#f6f3ec]/15">
              {i === active && (running
                ? <span key={`bar-${active}`} className={`${s.fill} block h-full bg-[#d9c193]`} style={{ ['--len' as string]: `${t.ms}ms` } as React.CSSProperties} />
                : <span className="block h-full w-full bg-[#d9c193]" />)}
            </span>
          </button>
        ))}
      </div>

      <figure className="overflow-hidden rounded-[16px] border border-white/10 bg-[#151916] shadow-[0_50px_100px_-40px_rgba(0,0,0,0.9)]">
        <div aria-hidden="true" className="flex items-center gap-2 border-b border-white/[0.07] bg-[#1b1f1c] px-3 py-2 sm:px-4">
          <span className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" /></span>
          <span className="ml-2 min-w-0 flex-1 truncate rounded-md bg-white/[0.06] px-3 py-1 text-center text-[10px] text-[#f6f3ec]/55 sm:text-[11px]">quadcomputing.app · {tab.url}</span>
        </div>
        <div role="tabpanel" aria-label={tab.label} className="relative w-full overflow-hidden bg-[#faf9f6]" style={{ aspectRatio: ratio }}>
          <StageVideo key={tab.id} id={tab.id} play={inView && !calm} />
        </div>
      </figure>
    </div>
  );
}
