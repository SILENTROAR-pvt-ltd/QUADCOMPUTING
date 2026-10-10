'use client';

import React, { useRef } from 'react';
import { Upload, X } from 'lucide-react';
import type { CatalogItem } from '@/types';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';

interface ServiceEditFormProps {
  item: CatalogItem;
  serviceName: string;
  setServiceName: (v: string) => void;
  servicePrice: string;
  setServicePrice: (v: string) => void;
  serviceCategory: string;
  setServiceCategory: (v: string) => void;
  serviceDuration: string;
  setServiceDuration: (v: string) => void;
  serviceProvider: 'in_house' | 'third_party';
  setServiceProvider: (v: 'in_house' | 'third_party') => void;
  serviceDescription: string;
  setServiceDescription: (v: string) => void;
  serviceImageUrl: string;
  setServiceImageUrl: (v: string) => void;
  isSubmitting: boolean;
  setIsSubmitting: (v: boolean) => void;
  setError: (v: string) => void;
  onSuccess: () => void;
  onClose: () => void;
}

export function ServiceEditForm({
  item,
  serviceName,
  setServiceName,
  servicePrice,
  setServicePrice,
  serviceCategory,
  setServiceCategory,
  serviceDuration,
  setServiceDuration,
  serviceProvider,
  setServiceProvider,
  serviceDescription,
  setServiceDescription,
  serviceImageUrl,
  setServiceImageUrl,
  setIsSubmitting,
  setError,
  onSuccess,
  onClose,
}: ServiceEditFormProps) {
  const upsertCatalogItem = useHostWorkspace((state) => state.upsertCatalogItem);
  const serviceFileInputRef = useRef<HTMLInputElement>(null);

  const inputClass =
    'w-full rounded-xl border border-neutral-200/90 bg-white hover:border-neutral-300 focus:border-neutral-900 px-4 py-2.5 sm:py-3 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-2xs transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-neutral-900/10';
  const labelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500';

  const handleServiceImageFileSelect = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setServiceImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        id: item.id,
        name: serviceName.trim(),
        item_type: 'service',
        category: serviceCategory,
        price: parseFloat(servicePrice),
        description: serviceDescription.trim(),
        image_url: serviceImageUrl.trim() || null,
        duration: serviceDuration,
        providerType: serviceProvider,
        metadata: {
          duration: serviceDuration,
          provider_type: serviceProvider,
        },
      };

      const res = await fetch('/api/host/catalog/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update service.');
      }

      upsertCatalogItem({
        ...item,
        name: serviceName.trim(),
        kind: 'service',
        price: { amountMinor: parseFloat(servicePrice), currency: 'INR' },
        description: serviceDescription.trim(),
        imageUrl: serviceImageUrl.trim() || null,
        category: serviceCategory,
        duration: serviceDuration,
        providerType: serviceProvider,
      } as any);

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form id="service-edit-form" onSubmit={handleServiceSubmit} className="space-y-6 animate-in fade-in duration-200">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Service Name *</label>
          <input
            required
            type="text"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            className={inputClass}
            placeholder="e.g. Candlelight Dinner Setup"
          />
        </div>

        <div>
          <label className={labelClass}>Price (₹) *</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-400 select-none">
              ₹
            </span>
            <input
              required
              type="number"
              min="0"
              step="any"
              value={servicePrice}
              onChange={(e) => setServicePrice(e.target.value)}
              className={`${inputClass} pl-8 font-mono font-medium`}
              placeholder="1200.00"
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Service Category *</label>
          <select
            value={serviceCategory}
            onChange={(e) => setServiceCategory(e.target.value)}
            className={`${inputClass} cursor-pointer bg-white`}
          >
            <option value="Services" className="bg-white text-neutral-900">Services & Add-Ons</option>
            <option value="Rental" className="bg-white text-neutral-900">Equipment & Vehicle Rental</option>
            <option value="Transportation" className="bg-white text-neutral-900">Transportation & Transfers</option>
            <option value="Wellness" className="bg-white text-neutral-900">Wellness & Spa</option>
            <option value="Tours" className="bg-white text-neutral-900">Guided Tours & Treks</option>
            <option value="Housekeeping" className="bg-white text-neutral-900">Housekeeping & Laundry</option>
            <option value="Activities" className="bg-white text-neutral-900">Activities & Experiences</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Billing Duration / Cadence *</label>
          <select
            value={serviceDuration}
            onChange={(e) => setServiceDuration(e.target.value)}
            className={`${inputClass} cursor-pointer bg-white`}
          >
            <option value="per_stay" className="bg-white text-neutral-900">Per Stay</option>
            <option value="per_night" className="bg-white text-neutral-900">Per Night</option>
            <option value="per_person_day" className="bg-white text-neutral-900">Per Person / Day</option>
            <option value="per_hour" className="bg-white text-neutral-900">Per Hour</option>
            <option value="per_session" className="bg-white text-neutral-900">Per Session</option>
            <option value="one_time" className="bg-white text-neutral-900">One-Time Charge</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Service Provider *</label>
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-neutral-200/90 bg-neutral-100/80 p-1">
            {[
              { id: 'in_house', label: 'In-House Staff' },
              { id: 'third_party', label: 'Partner / Vendor' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setServiceProvider(p.id as any)}
                className={`rounded-lg py-2 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  serviceProvider === p.id
                    ? 'bg-white text-neutral-950 shadow-sm border border-neutral-200/80'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-white/50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>Description & Inclusions</label>
          <textarea
            rows={2}
            value={serviceDescription}
            onChange={(e) => setServiceDescription(e.target.value)}
            className={`${inputClass} resize-none`}
            placeholder="Details about inclusions, timing, booking rules..."
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>Cover Image</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={serviceImageUrl}
              onChange={(e) => setServiceImageUrl(e.target.value)}
              className={`${inputClass} flex-1`}
              placeholder="https://images.unsplash.com/... or paste image URL"
            />
            <input
              type="file"
              ref={serviceFileInputRef}
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleServiceImageFileSelect(e.target.files[0])}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => serviceFileInputRef.current?.click()}
              className="rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 active:bg-neutral-100 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 shadow-2xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Upload className="h-4 w-4 text-neutral-500" />
              <span>Upload</span>
            </button>
          </div>
          {serviceImageUrl && (
            <div className="mt-3 h-28 w-44 overflow-hidden rounded-xl border border-neutral-200 shadow-xs relative group bg-neutral-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={serviceImageUrl} alt="Service Preview" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setServiceImageUrl('')}
                className="absolute top-1.5 right-1.5 rounded-full bg-white/90 hover:bg-white text-neutral-700 hover:text-neutral-900 p-1.5 shadow-sm backdrop-blur-xs transition-all cursor-pointer"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
