'use client';

import React from 'react';
import type { CatalogItem } from '@/types';
import { FoodIngestForm } from './food/FoodIngestForm';
import { ServiceEditForm } from './service/ServiceEditForm';
import { CatalogItemDeleteButton } from './components/CatalogItemDeleteButton';
import { EditItemHeader } from './components/EditItemHeader';
import { CatalogTypeSelector } from './components/CatalogTypeSelector';
import { useEditItemForm } from './hooks/useEditItemForm';
import { Bed, CheckCircle2 } from 'lucide-react';

interface EditItemModalProps {
  item: CatalogItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditItemModal({ item, onClose, onSuccess }: EditItemModalProps) {
  const form = useEditItemForm(item);
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`w-full max-h-[92vh] overflow-hidden rounded-2xl sm:rounded-3xl bg-white border border-neutral-200 shadow-2xl transition-all duration-300 flex flex-col text-neutral-900 ${form.activeType === 'food' ? 'max-w-3xl' : 'max-w-4xl'}`}>
        <EditItemHeader itemName={item.name} onClose={onClose} />

        <div className="overflow-y-auto px-6 py-6 flex-1 space-y-6">
          {form.error && <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700 animate-in fade-in">{form.error}</div>}
          <CatalogTypeSelector activeType={form.activeType} onChange={form.setActiveType} />

          {form.activeType === 'food' && (
            <div className="animate-in fade-in duration-200">
              <FoodIngestForm item={item} onSuccess={onSuccess} onClose={onClose} isSubmitting={form.isSubmitting} setIsSubmitting={form.setIsSubmitting} setError={form.setError} />
            </div>
          )}

          {form.activeType === 'service' && (
            <ServiceEditForm
              item={item} serviceName={form.serviceName} setServiceName={form.setServiceName}
              servicePrice={form.servicePrice} setServicePrice={form.setServicePrice}
              serviceCategory={form.serviceCategory} setServiceCategory={form.setServiceCategory}
              serviceDuration={form.serviceDuration} setServiceDuration={form.setServiceDuration}
              serviceProvider={form.serviceProvider} setServiceProvider={form.setServiceProvider}
              serviceDescription={form.serviceDescription} setServiceDescription={form.setServiceDescription}
              serviceImageUrl={form.serviceImageUrl} setServiceImageUrl={form.setServiceImageUrl}
              isSubmitting={form.isSubmitting} setIsSubmitting={form.setIsSubmitting}
              setError={form.setError} onSuccess={onSuccess} onClose={onClose}
            />
          )}

          {form.activeType === 'room' && (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-center animate-in fade-in duration-200">
              <Bed className="h-8 w-8 text-neutral-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-neutral-900">Accommodation Room Category</h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                Accommodations include physical inventory, multi-guest occupancy, and room assignment builders. Please configure them through the dedicated Accommodations configurator.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-neutral-200 bg-neutral-50 px-6 py-4">
          <CatalogItemDeleteButton item={item} onError={form.setError} onSuccess={onSuccess} onClose={onClose} />
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="rounded-xl px-5 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 transition-colors cursor-pointer">
              Cancel
            </button>
            {form.activeType !== 'room' && (
              <button
                type="submit" form={form.activeType === 'food' ? 'food-ingest-form' : 'service-edit-form'}
                disabled={form.isSubmitting} className="rounded-xl bg-neutral-900 px-7 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
              >
                {form.isSubmitting ? (
                  <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /><span>Saving Changes...</span></>
                ) : (
                  <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /><span>Save Changes</span></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
