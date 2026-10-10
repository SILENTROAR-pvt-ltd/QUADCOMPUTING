'use client';

import React from 'react';
import { BellRing, Flame, Sparkles } from 'lucide-react';
import type { ActiveOrderItem } from '../types';
import type { StageConfig } from './TrackerTimeline';

interface Props {
  currentStage: number;
  activeStageConfig: StageConfig;
  items: ActiveOrderItem[];
}

export function TrackerStatusCallout({ currentStage, activeStageConfig, items }: Props) {
  return (
    <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-3 sm:p-3.5 flex items-start gap-3">
      <div className="p-2 rounded-lg bg-white border border-neutral-200 text-neutral-700 shrink-0 mt-0.5">
        {currentStage === 3 ? (
          <BellRing className="w-4 h-4 text-neutral-700 animate-bounce" />
        ) : currentStage === 2 ? (
          <Flame className="w-4 h-4 text-neutral-700 animate-pulse" />
        ) : (
          <Sparkles className="w-4 h-4 text-neutral-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-neutral-700">
          {activeStageConfig.description}
        </p>
        {items.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[10px] text-neutral-400 font-light">
            <span className="text-neutral-700 font-medium">On Ticket:</span>
            {items.slice(0, 3).map((it, idx) => (
              <span key={it.id || idx} className="bg-white px-1.5 py-0.5 rounded text-neutral-700 border border-neutral-200">
                {it.item_name || (it as any).name} ×{it.quantity}
              </span>
            ))}
            {items.length > 3 && (
              <span className="text-neutral-400">+{items.length - 3} more</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
