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
          <div className="rounded-3xl border border-neutral-200 bg-white px-6 py-14 text-center">
            <Tag className="mx-auto h-6 w-6 text-neutral-300" />
            <p className="mt-3 font-serif text-lg text-neutral-900">No offers right now</p>
            <p className="mt-1 text-xs text-neutral-500">When {venueName || 'the venue'} runs an offer, it shows up here.</p>
          </div>
        }
      />
    );
  }
  return <VenueReviewPortal currentUserTable={table} currentUserName={guestName} cafeId={venueId} venueName={venueName} />;
}

export default LoungeViews;
