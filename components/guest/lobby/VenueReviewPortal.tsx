'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownUp, PenLine } from 'lucide-react';
import { PremiumStar } from '@/components/guest/menu/tracker/PremiumStar';
import type { ReviewFilterOption, ReviewItem, ReviewSortOption, ReviewSubmissionPayload } from './reviews/review.types';
import { filterReviews, sortReviews, summarizeReviews } from './reviews/review-look';
import { ReviewScoreSummary } from './reviews/ReviewScoreSummary';
import { ReviewCard } from './reviews/ReviewCard';
import { ReviewSubmissionForm } from './reviews/ReviewSubmissionForm';
import { SocialMediaLightbox } from './SocialMediaLightbox';

interface VenueReviewPortalProps {
  currentUserTable?: string;
  currentUserName?: string;
  cafeId?: string;
  venueName?: string;
}

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;

const FILTERS: Array<{ id: ReviewFilterOption; label: string }> = [
  { id: 'all', label: 'All' },
  { id: '5star', label: '5 ★' },
  { id: '4star', label: '4 ★' },
  { id: '3below', label: '≤ 3 ★' },
];

/** The venue's guest reviews: the rating, the reviews in the guest's own words, and a sheet to write one. */
export function VenueReviewPortal({ currentUserTable = 'T-01', currentUserName = 'You', cafeId = '', venueName = '' }: VenueReviewPortalProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [writing, setWriting] = useState(false);
  const [thanks, setThanks] = useState(false);
  const [filter, setFilter] = useState<ReviewFilterOption>('all');
  const [sort, setSort] = useState<ReviewSortOption>('latest');
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!cafeId) { setLoading(false); return; }
    setLoadError(false);
    try {
      const res = await fetch(`/api/guest/reviews?cafe_id=${encodeURIComponent(cafeId)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.reviews)) throw new Error('bad response');
      setReviews(data.reviews);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  useEffect(() => { void load(); }, [load]);

  // A review is shown as posted only once the venue has saved it; a failure is reported in the sheet, with the words kept.
  const submit = async (payload: ReviewSubmissionPayload): Promise<string | null> => {
    try {
      const res = await fetch(`/api/guest/reviews?cafe_id=${encodeURIComponent(cafeId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, cafe_id: cafeId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.review) return data?.error || 'We could not send your review just now. Please try again.';
      setReviews((prev) => [data.review as ReviewItem, ...prev]);
      setWriting(false);
      setThanks(true);
      setTimeout(() => setThanks(false), 5000);
      return null;
    } catch {
      return 'We could not reach the venue. Please check your connection and try again.';
    }
  };

  const stats = useMemo(() => summarizeReviews(reviews), [reviews]);
  const visible = useMemo(() => sortReviews(filterReviews(reviews, filter), sort), [reviews, filter, sort]);
  const hasPhotos = useMemo(() => reviews.some((r) => (r.images?.length ?? 0) > 0), [reviews]);
  const activeStar = filter === '5star' ? 5 : filter === '4star' ? 4 : filter === '3below' ? 3 : null;
  const filters = hasPhotos ? [...FILTERS, { id: 'photos' as const, label: 'Photos' }] : FILTERS;

  return (
    <section aria-label="Guest reviews" className="space-y-5 pb-10 pt-2">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-neutral-400">From our guests</p>
          <h2 className="mt-1 text-[30px] leading-none text-neutral-950" style={SERIF}>Reviews</h2>
        </div>
        <button
          type="button"
          onClick={() => setWriting(true)}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-zinc-950 px-5 text-[13px] font-semibold text-white shadow-[0_12px_24px_-14px_rgba(0,0,0,0.7)] transition-colors hover:bg-zinc-800 active:scale-[0.98] cursor-pointer"
        >
          <PenLine className="h-4 w-4" aria-hidden /> Write a review
        </button>
      </div>

      {thanks && (
        <p role="status" className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-center">
          <span className="block text-[16px] text-zinc-950" style={SERIF}>Thank you for your review.</span>
          <span className="mt-0.5 block text-[12px] text-zinc-500">It means a great deal to {venueName || 'us'} and to guests deciding where to dine.</span>
        </p>
      )}

      {loading ? (
        <div aria-hidden className="space-y-3">
          <div className="h-[148px] animate-pulse rounded-[24px] bg-neutral-100" />
          <div className="h-[132px] animate-pulse rounded-[22px] bg-neutral-100" />
        </div>
      ) : loadError ? (
        <div className="rounded-[22px] border border-neutral-200 bg-white px-6 py-10 text-center">
          <p className="text-[13px] text-neutral-600">We could not load the reviews just now.</p>
          <button type="button" onClick={() => { setLoading(true); void load(); }} className="mt-3 inline-flex h-10 items-center rounded-full border border-neutral-200 px-5 text-[13px] font-semibold text-zinc-900 cursor-pointer">Try again</button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
          <div aria-hidden className="mx-auto flex w-fit gap-1">
            {[1, 2, 3, 4, 5].map((n) => <PremiumStar key={n} filled={false} className="h-7 w-7" />)}
          </div>
          <p className="mt-4 text-[21px] text-zinc-950" style={SERIF}>Be the first to review</p>
          <p className="mx-auto mt-1.5 max-w-[250px] text-[12.5px] leading-snug text-zinc-500">Tell other guests about your visit to {venueName || 'the venue'}. It only takes a moment.</p>
          <button type="button" onClick={() => setWriting(true)} className="mt-5 inline-flex h-11 items-center rounded-full bg-zinc-950 px-6 text-[13px] font-semibold text-white cursor-pointer">Write a review</button>
        </div>
      ) : (
        <>
          <ReviewScoreSummary
            overallScore={stats.overall}
            totalReviews={stats.total}
            distribution={stats.distribution}
            activeStar={activeStar}
            onSelectStar={(star) => setFilter(star === 5 ? '5star' : star === 4 ? '4star' : star === 3 ? '3below' : 'all')}
          />

          <div className="flex items-center gap-2">
            <div role="tablist" aria-label="Filter reviews" className="flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-full border border-neutral-200/80 bg-white p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {filters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={`h-8 shrink-0 rounded-full px-3 text-[12.5px] font-semibold transition-colors cursor-pointer ${filter === f.id ? 'bg-zinc-950 text-white' : 'text-neutral-500 active:bg-neutral-100'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSort((s) => (s === 'latest' ? 'highest' : 'latest'))}
              aria-label={sort === 'latest' ? 'Showing newest first. Show top rated first' : 'Showing top rated first. Show newest first'}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-neutral-200/80 bg-white px-3.5 text-[12px] font-semibold text-neutral-700 cursor-pointer active:scale-95"
            >
              <ArrowDownUp className="h-3.5 w-3.5" aria-hidden /> {sort === 'latest' ? 'Newest' : 'Top rated'}
            </button>
          </div>

          {visible.length === 0 ? (
            <p className="rounded-[22px] border border-neutral-200 bg-white px-6 py-10 text-center text-[13px] text-neutral-500">No reviews match that filter yet.</p>
          ) : (
            <div className="space-y-3">
              {visible.map((review) => <ReviewCard key={review.id} review={review} onPhotoClick={setLightboxPhoto} />)}
            </div>
          )}
        </>
      )}

      {writing && (
        <ReviewSubmissionForm
          currentUserName={currentUserName}
          currentUserTable={currentUserTable}
          venueName={venueName}
          onSubmit={submit}
          onCancel={() => setWriting(false)}
        />
      )}

      <SocialMediaLightbox imageUrl={lightboxPhoto} onClose={() => setLightboxPhoto(null)} altText="Guest review photo" />
    </section>
  );
}

export default VenueReviewPortal;
