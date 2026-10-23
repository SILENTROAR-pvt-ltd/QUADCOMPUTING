'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { ControlCenterHeader, type ControlCenterTab } from '@/components/host/ControlCenterHeader';
import { WelcomeTour } from '@/components/host/tour/WelcomeTour';
import { openWelcomeTour } from '@/components/host/tour/useWelcomeTour';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import { DEMO_VENUE } from '@/lib/showcase/demo-orders';

/** The real welcome tour over the real console header, for a fictional venue that runs a café and rooms. */
export function TourScreen() {
  const [tab, setTab] = useState<ControlCenterTab>('profile');
  useEffect(() => {
    useHostWorkspace.setState({ hydrated: true, profile: { categoriesHandled: ['cafe', 'restaurant', 'hotel'] } as any });
    const t = setTimeout(openWelcomeTour, 300);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <Suspense><ControlCenterHeader activeTab={tab} onTabChange={setTab} venueName={DEMO_VENUE.name} venueId={DEMO_VENUE.id} /></Suspense>
      <p data-tab={tab} className="px-8 py-6 font-serif text-3xl text-neutral-900">{tab}</p>
      <WelcomeTour venueId={DEMO_VENUE.id} venueName={DEMO_VENUE.name} onShowTab={setTab} />
    </div>
  );
}
