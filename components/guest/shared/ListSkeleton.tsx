import React from 'react';

/** Shimmering rows standing in for a list while it loads: same shape as the rows that replace them, so nothing jumps. */
export function ListSkeleton({ rows = 3, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-3 px-5 py-5 sm:px-6">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="shimmer h-11 w-11 shrink-0 rounded-xl" style={{ animationDelay: `${i * 100}ms` }} />
          <span className="flex-1 space-y-2">
            <span className="shimmer block h-3.5 w-2/3 rounded" style={{ animationDelay: `${i * 100}ms` }} />
            <span className="shimmer block h-3 w-1/3 rounded" style={{ animationDelay: `${i * 100}ms` }} />
          </span>
          <span className="shimmer h-4 w-12 rounded" style={{ animationDelay: `${i * 100}ms` }} />
        </div>
      ))}
    </div>
  );
}
