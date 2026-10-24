'use client';

import React, { Suspense } from 'react';
import { ControlCenterHeader, type ControlCenterTab } from '@/components/host/ControlCenterHeader';
import { DEMO_VENUE } from '@/lib/showcase/demo-orders';

const noop = () => undefined;

/** The real control-centre header, on the given tab, over the screen's own content. */
export function Chrome({ tab, children, wide = false }: { tab: ControlCenterTab; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <Suspense><ControlCenterHeader activeTab={tab} onTabChange={noop} venueName={DEMO_VENUE.name} venueId={DEMO_VENUE.id} /></Suspense>
      <div className={`mx-auto space-y-4 px-8 py-6 ${wide ? 'max-w-[1400px]' : 'max-w-7xl'}`}>{children}</div>
    </div>
  );
}
