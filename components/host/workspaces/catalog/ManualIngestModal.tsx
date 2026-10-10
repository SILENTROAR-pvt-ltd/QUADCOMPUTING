'use client';

import React, { useState } from 'react';
import { RoomCategoryForm } from '../accommodations/configurator/RoomCategoryForm';
import { FoodIngestForm } from './food/FoodIngestForm';
import { ServiceIngestForm } from './services/ServiceIngestForm';
import { CatalogTypeSelector, type CatalogActiveType } from './components/CatalogTypeSelector';
import { ManualIngestFooter } from './components/ManualIngestFooter';
import { useAccommodationSubmit } from './hooks/useAccommodationSubmit';
import { X } from 'lucide-react';

interface ManualIngestModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialItemType?: CatalogActiveType;
}

export function ManualIngestModal({
  onClose,
  onSuccess,
  initialItemType = 'food',
}: ManualIngestModalProps) {
  const [activeType, setActiveType] = useState<CatalogActiveType>(initialItemType);
  const [serviceActiveCount, setServiceActiveCount] = useState(0);

  const {
    isSubmitting,
    setIsSubmitting,
    error,
    setError,
    submitAccommodation,
  } = useAccommodationSubmit(onSuccess, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-h-[92vh] overflow-hidden rounded-2xl sm:rounded-3xl bg-white border border-neutral-200 shadow-2xl transition-all duration-300 flex flex-col ${activeType === 'food' ? 'max-w-3xl' : 'max-w-4xl'
          }`}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 bg-neutral-50/60">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-neutral-900">
              New Catalog Item
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Select classification to configure menu items, accommodations, or guest services.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6 flex-1 space-y-6">
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700 animate-in fade-in">
              {error}
            </div>
          )}

          <CatalogTypeSelector activeType={activeType} onChange={setActiveType} />

          {activeType === 'room' && (
            <div className="animate-in fade-in duration-200">
              <RoomCategoryForm
                isSubmitting={isSubmitting}
                onSubmit={submitAccommodation}
                onCancel={onClose}
                isEditMode={false}
                showRoomNumbers={true}
                submitButtonText="Commit Room Category & Provision Physical Rooms"
              />
            </div>
          )}

          {activeType === 'food' && (
            <div className="animate-in fade-in duration-200">
              <FoodIngestForm
                onSuccess={onSuccess}
                onClose={onClose}
                isSubmitting={isSubmitting}
                setIsSubmitting={setIsSubmitting}
                setError={setError}
              />
            </div>
          )}

          {activeType === 'service' && (
            <div className="animate-in fade-in duration-200">
              <ServiceIngestForm
                onSuccess={onSuccess}
                onClose={onClose}
                isSubmitting={isSubmitting}
                setIsSubmitting={setIsSubmitting}
                setError={setError}
                onActiveCountChange={setServiceActiveCount}
              />
            </div>
          )}
        </div>

        <ManualIngestFooter
          activeType={activeType}
          isSubmitting={isSubmitting}
          serviceActiveCount={serviceActiveCount}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
