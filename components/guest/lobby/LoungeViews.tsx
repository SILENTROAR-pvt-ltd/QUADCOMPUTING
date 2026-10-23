'use client';

import React from 'react';
import { Tag } from 'lucide-react';
import { VibersLobby } from '@/components/guest/vibers-lobby/VibersLobby';
import { LiveEventsFeed } from '@/components/guest/events/LiveEventsFeed';
import { VenueLiveOffers } from './VenueLiveOffers';
import { VenueReviewPortal } from './VenueReviewPortal';
import type { LoungeView } from './LoungeTopBar';

interface LoungeViewsProps {
  view: LoungeView;
  venueId: string;
  venueName: string;
  table: string;
  guestName: string;
  canPost: boolean;
  onRequestJoin: () => void;
}

/** The lounge section the guest is viewing. */
export function LoungeViews({ view, venueId, venueName, table, guestName, canPost, onRequestJoin }: LoungeViewsProps) {
  if (view === 'chat') {
    return (
      <VibersLobby
        venueId={venueId}
        venueName={venueName}
        table={table}
        guestName={guestName}
        canPost={canPost}
        onRequestJoin={onRequestJoin}
      />
    );
  }
  if (view === 'moments') return <LiveEventsFeed venueId={venueId} />;
  if (view === 'offers') {
    return (
      <VenueLiveOffers
        venueId={venueId}
        tableNumber={table}
        emptyState={
          <div className="rounded-[26px] border border-dashed border-[#d9c193] bg-[#fbf9f4] px-6 py-14 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#0f2a1e] text-[#d9c193]"><Tag className="h-5 w-5" /></span>
            <p className="mt-4 text-[1.5rem] text-[#10231a]" style={{ fontFamily: "var(--font-luxe), 'Playfair Display', Georgia, serif" }}>No offers right now</p>
            <p className="mt-1 text-xs text-[#10231a]/55">When {venueName || 'the venue'} runs an offer, it shows up here.</p>
          </div>
        }
      />
    );
  }
  return <VenueReviewPortal currentUserTable={table} currentUserName={guestName} cafeId={venueId} venueName={venueName} />;
}

export default LoungeViews;
