'use client';

import React from 'react';
import { Sparkles, Plus, Camera } from 'lucide-react';

interface Props {
  isBulkPricingOpen: boolean;
  isAutoFilling: boolean;
  onToggleBulkPricing: () => void;
  onOpenAiModal?: () => void;
  onAutoFillImages: () => void;
  onOpenServicesModal: () => void;
  onOpenNewItemModal: () => void;
  onOpenPhotoVaultModal: () => void;
  onOpenDishIngest: () => void;
}

export function CatalogHeader({
  isBulkPricingOpen,
  isAutoFilling,
  onToggleBulkPricing,
  onAutoFillImages,
  onOpenServicesModal,
  onOpenNewItemModal,
  onOpenPhotoVaultModal,
  onOpenDishIngest,
}: Props) {
  return (
    <div className="mb-6 space-y-4">
      {/* Top Row: Page Title + Primary Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-neutral-900">
            Services & Catalog
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-neutral-500 font-light">
            Manage your menu cards, room tariffs, and service offerings.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewItemModal}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-neutral-800 active:scale-[0.99] transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
          <span>New Catalog Item</span>
        </button>
      </div>

      {/* Action Toolbar Row: Cohesive, perfectly aligned horizontal utility bar */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-wrap">
        <button
          type="button"
          onClick={onOpenPhotoVaultModal}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200/90 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-300 transition-all cursor-pointer whitespace-nowrap"
        >
          <Camera className="h-3.5 w-3.5 text-neutral-500" />
          <span>Photo Vault & Live Offers</span>
        </button>

        <button
          type="button"
          onClick={onOpenDishIngest}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200/90 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-300 transition-all cursor-pointer whitespace-nowrap"
        >
          <Camera className="h-3.5 w-3.5 text-neutral-500" />
          <span>Ingest dish photos</span>
        </button>

        <button
          type="button"
          onClick={onToggleBulkPricing}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold shadow-2xs transition-all cursor-pointer whitespace-nowrap ${
            isBulkPricingOpen
              ? 'border-neutral-300 bg-neutral-100 text-neutral-900'
              : 'border-neutral-200/90 bg-white text-neutral-700 hover:text-neutral-900 hover:border-neutral-300 hover:bg-neutral-50'
          }`}
        >
          <span>Flash Pricing Engine</span>
        </button>

        <button
          type="button"
          onClick={onAutoFillImages}
          disabled={isAutoFilling}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200/90 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-300 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
        >
          <span>{isAutoFilling ? 'Mapping images...' : 'Smart Stock Images'}</span>
        </button>

        <button
          type="button"
          onClick={onOpenServicesModal}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200/90 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-300 transition-all cursor-pointer whitespace-nowrap"
        >
          <Sparkles className="h-3.5 w-3.5 text-neutral-400" />
          <span>+ Add Services</span>
        </button>
      </div>
    </div>
  );
}

export default CatalogHeader;
