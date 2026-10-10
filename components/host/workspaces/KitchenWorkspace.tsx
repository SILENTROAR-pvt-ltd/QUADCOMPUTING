'use client';

import React from 'react';
import { KitchenBoard } from '@/components/kitchen/KitchenBoard';

export function KitchenWorkspace({ cafeId }: { cafeId?: string } = {}) {
  return (
    <div className="animate-in fade-in duration-300 pb-20 selection:bg-neutral-900 selection:text-white">
      <KitchenBoard businessId={cafeId} />
    </div>
  );
}
