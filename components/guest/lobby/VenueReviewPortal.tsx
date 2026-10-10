'use client';

import React, { useState, useMemo } from 'react';
import { PenLine, MessageSquare, Search, Camera, Star, ThumbsUp, Sparkles, SlidersHorizontal } from 'lucide-react';
import { ReviewItem, ReviewSubmissionPayload, ReviewFilterOption, ReviewSortOption } from './reviews/review.types';
import { INITIAL_REVIEWS } from './reviews/reviews.constants';
import { ReviewScoreSummary } from './reviews/ReviewScoreSummary';
import { ReviewCard } from './reviews/ReviewCard';
import { ReviewSubmissionForm } from './reviews/ReviewSubmissionForm';
import { SocialMediaLightbox } from './SocialMediaLightbox';

interface VenueReviewPortalProps {
  currentUserTable?: string;
  currentUserName?: string;
  cafeId?: string;
}

export function VenueReviewPortal({
  currentUserTable = 'T-01',
  currentUserName = 'You',
  cafeId = '',
}: VenueReviewPortalProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>(INITIAL_REVIEWS);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<ReviewFilterOption>('all');
  const [sortBy, setSortBy] = useState<ReviewSortOption>('latest');
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  React.useEffect(() => {
    if (!cafeId) return;
    fetch(`/api/guest/reviews?cafe_id=${encodeURIComponent(cafeId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.reviews && data.reviews.length > 0) {
          setReviews(data.reviews);
        }
      })
      .catch(() => {});
  }, [cafeId]);

  const handleAddReview = async (payload: ReviewSubmissionPayload) => {
    const optimisticReview: ReviewItem = {
      id: `rev-${Date.now()}`,
      author: payload.author,
      table: payload.table,
      rating: payload.rating,
      comment: payload.comment,
      timestamp: 'Just now',
      tags: payload.tags,
      verified: true,
      images: payload.images,
      helpfulCount: 0,
    };
    setReviews((prev) => [optimisticReview, ...prev]);
    setShowForm(false);

    try {
      const res = await fetch('/api/guest/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          business_id: cafeId || '',
        }),
      });
      const data = await res.json();
      if (data.success && data.review) {
        setReviews((prev) =>
          prev.map((r) => (r.id === optimisticReview.id ? data.review : r))
        );
      }
    } catch (err) {
      console.warn('[Review POST Note]:', err);
    }
  };

  // Google-Style Search & Filtering Pipeline
  const filteredReviews = useMemo(() => {
    return reviews
      .filter((rev) => {
        // 1. Category Filter
        if (selectedFilter === 'photos' && (!rev.images || rev.images.length === 0)) return false;
        if (selectedFilter === '5star' && rev.rating !== 5) return false;
        if (selectedFilter === '4star' && rev.rating !== 4) return false;
        if (selectedFilter === 'helpful' && (rev.helpfulCount || 0) < 5) return false;

        // 2. Keyword Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchComment = rev.comment.toLowerCase().includes(q);
          const matchAuthor = rev.author.toLowerCase().includes(q);
          const matchTable = rev.table.toLowerCase().includes(q);
          const matchTag = rev.tags?.some((t) => t.toLowerCase().includes(q));
          if (!matchComment && !matchAuthor && !matchTable && !matchTag) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'highest') return b.rating - a.rating;
        if (sortBy === 'helpful') return (b.helpfulCount || 0) - (a.helpfulCount || 0);
        return 0; // 'latest' retains insertion order
      });
  }, [reviews, selectedFilter, searchQuery, sortBy]);

  // Review stats are derived strictly from this venue's own reviews. They used
  // to be hardcoded (overall 4.9, "248 + reviews.length" ratings, static
  // per-metric scores), which meant a brand-new venue with zero reviews
  // advertised a 4.9/5 rating from 248 guests that never existed.
  const reviewStats = useMemo(() => {
    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    const overall = total > 0 ? sum / total : 0;
    const distribution = [5, 4, 3, 2, 1].map((stars) => {
      const count = reviews.filter((r) => Number(r.rating) === stars).length;
      return { stars, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 };
    });
    return { total, overall, distribution };
  }, [reviews]);

  return (
    <section className="space-y-6 pt-4 pb-10">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-[0.25em] text-neutral-400 font-semibold">
              From guests
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-normal text-neutral-950 tracking-tight">
            Reviews
          </h2>
          <p className="text-xs text-neutral-500 font-normal mt-1 max-w-lg leading-relaxed">
            What guests say about their visit. Rate yours too.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-neutral-950 text-white hover:bg-neutral-800 transition-all font-bold text-xs tracking-wide self-start sm:self-auto cursor-pointer active:scale-95 flex-shrink-0"
        >
          <PenLine className="w-3.5 h-3.5" />
          <span>{showForm ? 'Close Form' : 'Write a Review'}</span>
        </button>
      </div>

      {/* Google-Style Score & Distribution Summary */}
      <ReviewScoreSummary
        overallScore={reviewStats.overall}
        totalReviews={reviewStats.total}
        // venue_reviews stores a single overall rating per review — there are no
        // per-category (ambiance/service/acoustics/beverages) scores to report,
        // so none are shown rather than inventing them.
        metrics={[]}
        distribution={reviewStats.distribution}
        selectedFilter={selectedFilter}
        onSelectStarFilter={(star) => {
          if (star === 5) setSelectedFilter(selectedFilter === '5star' ? 'all' : '5star');
          else if (star === 4) setSelectedFilter(selectedFilter === '4star' ? 'all' : '4star');
          else setSelectedFilter('all');
        }}
      />

      {/* Expandable Review Submission Form */}
      {showForm && (
        <ReviewSubmissionForm
          currentUserName={currentUserName}
          currentUserTable={currentUserTable}
          onSubmit={handleAddReview}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Google-Style Filter Tabs, Search & Sort Control Bar */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Keyword Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reviews"
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-950 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 transition-all"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ReviewSortOption)}
              className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none focus:border-neutral-900 cursor-pointer"
            >
              <option value="latest">Sort: Latest</option>
              <option value="highest">Sort: Highest Rated</option>
              <option value="helpful">Sort: Most Helpful</option>
            </select>
          </div>
        </div>

        {/* Filter Pills with Ancient Cream Gold Active State */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'All Reviews', icon: Sparkles },
            { id: 'photos', label: 'With Photos', icon: Camera },
            { id: '5star', label: '5 Star Only', icon: Star },
            { id: '4star', label: '4 Star Only', icon: Star },
            { id: 'helpful', label: 'Most Helpful', icon: ThumbsUp },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedFilter(tab.id as ReviewFilterOption)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-neutral-950 text-white font-semibold border border-neutral-950'
                    : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border border-neutral-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'fill-white text-white' : 'text-neutral-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Testimonials Stream */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between text-xs text-neutral-500 font-mono">
          <span className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            {filteredReviews.length} {filteredReviews.length === 1 ? 'review' : 'reviews'}
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-amber-400 hover:underline cursor-pointer"
            >
              Clear Search
            </button>
          )}
        </div>

        {filteredReviews.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-neutral-200 bg-white p-8 space-y-2">
            <p className="text-sm text-neutral-600 font-medium">No reviews match your current filter</p>
            <p className="text-xs text-neutral-500">Try clearing your search query or selecting &quot;All Reviews&quot;.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onPhotoClick={(url) => setLightboxPhoto(url)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal for Review Photos */}
      <SocialMediaLightbox
        imageUrl={lightboxPhoto}
        onClose={() => setLightboxPhoto(null)}
        altText="Guest review photo"
      />
    </section>
  );
}

export default VenueReviewPortal;
