'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { CatalogActiveType } from './CatalogTypeSelector';

interface Props {
  activeType: CatalogActiveType;
  isSubmitting: boolean;
  serviceActiveCount: number;
  onClose: () => void;
}

export function ManualIngestFooter({
  activeType,
  isSubmitting,
  serviceActiveCount,
  onClose,
}: Props) {
  if (activeType === 'room') return null;

  return (
    <div className="flex items-center justify-end gap-3 border-t border-neutral-200 bg-neutral-50 px-6 py-4">
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl px-5 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 transition-colors cursor-pointer"
      >
        Cancel
      </button>
      <button
        type="submit"
        form={activeType === 'food' ? 'food-ingest-form' : 'service-ingest-form'}
        disabled={isSubmitting}
        className="rounded-xl bg-neutral-900 px-7 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
      >
        {isSubmitting ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <span>Saving...</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>
              {activeType === 'service' && serviceActiveCount > 0
                ? `Commit ${serviceActiveCount} Services to Database`
                : 'Commit to Database'}
            </span>
          </>
        )}
      </button>
    </div>
  );
}
