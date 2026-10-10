'use client';

import React from 'react';
import { Star, ShieldCheck, Sparkles, Music, Coffee, HeartHandshake } from 'lucide-react';
import { ScoreMetric, StarDistributionItem } from './review.types';

interface ReviewScoreSummaryProps {
  overallScore: number;
  totalReviews: number;
  metrics: ScoreMetric[];
  distribution: StarDistributionItem[];
  selectedFilter: string;
  onSelectStarFilter: (star: number | null) => void;
}

export function ReviewScoreSummary({
  overallScore,
  totalReviews,
  metrics,
  distribution,
  selectedFilter,
  onSelectStarFilter,
}: ReviewScoreSummaryProps) {
  const getMetricIcon = (key: string) => {
    switch (key) {
      case 'ambiance':
        return <Sparkles className="w-3.5 h-3.5 text-violet-600" />;
      case 'acoustics':
        return <Music className="w-3.5 h-3.5 text-neutral-500" />;
      case 'beverages':
        return <Coffee className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" />;
    }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-8 shadow-[0_1px_3px_rgba(0,0,0,0.03)] relative overflow-hidden">

      {/* 1. Large Editorial Score Card */}
      <div className="flex flex-col items-start min-w-[200px] border-b lg:border-b-0 lg:border-r border-neutral-200 pb-6 lg:pb-0 lg:pr-8 relative z-10">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 mb-2 shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
          <span className="text-[10px] uppercase tracking-[0.2em] font-semibold">
            Verified Index
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="font-serif text-5xl sm:text-6xl font-normal tracking-tight text-neutral-950 leading-none">
            {totalReviews === 0 ? '—' : overallScore.toFixed(1)}
          </span>
          <span className="text-sm font-medium text-neutral-500 tracking-wide">/ 5.0</span>
        </div>

        {/* Ancient Light Cream Glowing Stars */}
        <div className="flex items-center gap-1.5 mt-3">
          {/* Stars reflect the real score — previously all five rendered filled
              regardless, so a venue with no ratings still showed 5 gold stars. */}
          {[...Array(5)].map((_, i) => {
            const filled = i < Math.round(overallScore);
            return (
              <Star
                key={i}
                className={
                  filled
                    ? 'w-4 h-4 fill-amber-400 text-amber-400'
                    : 'w-4 h-4 text-neutral-300'
                }
              />
            );
          })}
          <span className="text-xs text-neutral-600 font-medium ml-2">
            {totalReviews === 0
              ? 'No ratings yet'
              : `${totalReviews} ${totalReviews === 1 ? 'rating' : 'ratings'}`}
          </span>
        </div>
      </div>

      {/* 2. Google-Style Star Distribution Breakdown */}
      <div className="min-w-[220px] sm:min-w-[260px] flex flex-col justify-center space-y-1.5 border-b lg:border-b-0 lg:border-r border-neutral-200 pb-6 lg:pb-0 lg:pr-8 relative z-10">
        <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-semibold mb-1 block">
          Rating Distribution
        </span>
        {distribution.map((item) => {
          const isFilterActive = selectedFilter === `${item.stars}star`;
          return (
            <button
              key={item.stars}
              type="button"
              onClick={() => onSelectStarFilter(isFilterActive ? null : item.stars)}
              className={`w-full flex items-center gap-2 group cursor-pointer text-left py-0.5 rounded-lg px-1.5 -mx-1.5 transition-colors ${
                isFilterActive ? 'bg-neutral-50' : 'hover:bg-neutral-100'
              }`}
            >
              <span className="w-4 text-[11px] font-mono font-medium text-neutral-600">
                {item.stars}
              </span>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-500 group-hover:brightness-110"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
              <span className="w-8 text-right font-mono text-[10px] text-neutral-500 group-hover:text-neutral-950">
                {item.percentage}%
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Micro-Metrics Breakdown */}
      <div className="flex-1 grid grid-cols-2 gap-3 relative z-10">
        {metrics.map((m) => {
          const percentage = Math.round((m.score / m.maxScore) * 100);
          return (
            <div
              key={m.key}
              className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3 flex flex-col justify-between transition-all hover:border-neutral-300 hover:bg-white"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="p-1 rounded-lg bg-neutral-50 border border-neutral-200">
                  {getMetricIcon(m.key)}
                </span>
                <span className="font-mono text-xs font-semibold text-neutral-950">
                  {m.score.toFixed(2)}
                </span>
              </div>
              <div>
                <p className="text-[11px] font-medium text-neutral-600 truncate mb-1">
                  {m.label}
                </p>
                <div className="w-full h-1 bg-neutral-50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-700"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ReviewScoreSummary;
