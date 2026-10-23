'use client';

import React, { useMemo, useState } from 'react';
import { PenLine } from 'lucide-react';
import { PremiumStar } from '@/components/guest/menu/tracker/PremiumStar';
import type { ReviewFilterOption, ReviewSortOption, ReviewSubmissionPayload } from './reviews/review.types';
import { filterReviews, sortReviews, summarizeReviews } from './reviews/review-look';
import { ReviewScoreSummary } from './reviews/ReviewScoreSummary';
import { ReviewCard } from './reviews/ReviewCard';
import { ReviewFilterBar } from './reviews/ReviewFilterBar';
import { ReviewSubmissionForm } from './reviews/ReviewSubmissionForm';
import { useVenueReviews } from './reviews/useVenueReviews';
import { SocialMediaLightbox } from './SocialMediaLightbox';
import s from '@/components/guest/luxe/luxe-guest.module.css';

interface VenueReviewPortalProps {
  currentUserTable?: string;
  currentUserName?: string;
  cafeId?: string;
  venueName?: string;
}

const SERIF = { fontFamily: "var(--font-luxe), 'Playfair Display', Georgia, serif" } as const;
const SOLID = 'inline-flex items-center rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] font-semibold text-[#f5f1e8] ring-1 ring-[#d9c193]/30 cursor-pointer active:scale-[0.98]';

/** The venue's guest reviews: the rating, the reviews in the guests' own words, and a sheet to write one. */
export function VenueReviewPortal({ currentUserTable = 'T-01', currentUserName = 'You', cafeId = '', venueName = '' }: VenueReviewPortalProps) {
  const { reviews, loading, loadError, thanks, submit, retry } = useVenueReviews(cafeId);
  const [writing, setWriting] = useState(false);
  const [filter, setFilter] = useState<ReviewFilterOption>('all');
  const [sort, setSort] = useState<ReviewSortOption>('latest');
  const [photo, setPhoto] = useState<string | null>(null);

  const stats = useMemo(() => summarizeReviews(reviews), [reviews]);
  const visible = useMemo(() => sortReviews(filterReviews(reviews, filter), sort), [reviews, filter, sort]);
  const hasPhotos = useMemo(() => reviews.some((r) => (r.images?.length ?? 0) > 0), [reviews]);
  const activeStar = filter === '5star' ? 5 : filter === '4star' ? 4 : filter === '3below' ? 3 : null;

  const send = async (payload: ReviewSubmissionPayload) => {
    const problem = await submit(payload);
    if (!problem) setWriting(false);
    return problem;
  };

  return (
    <section aria-label="Guest reviews" className="space-y-5 pb-10 pt-2">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8a6d3f] before:h-px before:w-6 before:bg-[#b08d57]">From our guests</p>
          <h2 className="mt-2 text-[2.2rem] font-light leading-none text-[#10231a]" style={SERIF}>Guest <em className="font-normal text-[#8a6d3f]">reviews</em></h2>
        </div>
        <button type="button" onClick={() => setWriting(true)} className={`h-11 shrink-0 gap-2 px-5 text-[13px] shadow-[0_12px_24px_-14px_rgba(15,42,30,0.8)] ${SOLID}`}>
          <PenLine className="h-4 w-4" aria-hidden /> Write a review
        </button>
      </div>

      {thanks && (
        <p role="status" className="rounded-[22px] border border-[#d9c193] bg-[#fbf6e8] px-4 py-3 text-center">
          <span className="block text-[19px] text-[#10231a]" style={SERIF}>Thank you for your review.</span>
          <span className="mt-0.5 block text-[12px] text-[#10231a]/60">It means a great deal to {venueName || 'us'} and to guests deciding where to dine.</span>
        </p>
      )}

      {loading ? (
        <div aria-hidden className="space-y-3">
          <div className="shimmer h-[148px] rounded-[24px]" />
          <div className="shimmer h-[132px] rounded-[22px]" />
        </div>
      ) : loadError ? (
        <div className="rounded-[22px] border border-[#e8dfcc] bg-[#fbf9f4] px-6 py-10 text-center">
          <p className="text-[13px] text-[#10231a]/65">We could not load the reviews just now.</p>
          <button type="button" onClick={retry} className="mt-3 inline-flex h-11 cursor-pointer items-center rounded-full border border-[#d9c193] px-5 text-[13px] font-semibold text-[#10231a]">Try again</button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-[26px] border border-dashed border-[#d9c193] bg-[#fbf9f4] px-6 py-12 text-center">
          <div aria-hidden className="mx-auto flex w-fit gap-1">{[1, 2, 3, 4, 5].map((n) => <PremiumStar key={n} filled={false} className="h-7 w-7" />)}</div>
          <p className="mt-4 text-[1.6rem] text-[#10231a]" style={SERIF}>Be the first to review</p>
          <p className="mx-auto mt-1.5 max-w-[250px] text-[12.5px] leading-snug text-[#10231a]/55">Tell other guests about your visit to {venueName || 'the venue'}. It only takes a moment.</p>
          <button type="button" onClick={() => setWriting(true)} className={`mt-5 h-11 px-6 text-[13px] ${SOLID}`}>Write a review</button>
        </div>
      ) : (
        <>
          <ReviewScoreSummary overallScore={stats.overall} totalReviews={stats.total} distribution={stats.distribution} activeStar={activeStar}
            onSelectStar={(s) => setFilter(s === 5 ? '5star' : s === 4 ? '4star' : s === 3 ? '3below' : 'all')} />
          <ReviewFilterBar filter={filter} onFilter={setFilter} sort={sort} onSort={() => setSort((s) => (s === 'latest' ? 'highest' : 'latest'))} hasPhotos={hasPhotos} />
          {visible.length === 0 ? (
            <p className="rounded-[22px] border border-[#e8dfcc] bg-[#fbf9f4] px-6 py-10 text-center text-[13px] text-[#10231a]/55">No reviews match that filter yet.</p>
          ) : (
            <div className="space-y-3">
              {visible.map((r, i) => (
                <div key={`${filter}-${sort}-${r.id}`} className={s.riseIn} style={{ ['--i' as string]: i } as React.CSSProperties}>
                  <ReviewCard review={r} onPhotoClick={setPhoto} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {writing && <ReviewSubmissionForm currentUserName={currentUserName} currentUserTable={currentUserTable} venueName={venueName} onSubmit={send} onCancel={() => setWriting(false)} />}
      <SocialMediaLightbox imageUrl={photo} onClose={() => setPhoto(null)} altText="Guest review photo" />
    </section>
  );
}

export default VenueReviewPortal;
