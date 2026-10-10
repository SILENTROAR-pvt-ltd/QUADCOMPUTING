'use client';

import React, { useState, useRef } from 'react';
import type { 
  CatalogServiceItem, 
  ServiceQuickTemplate, 
  ServiceCategory, 
  ServiceBillingDuration, 
  ServiceProviderType 
} from './types';
import { DEFAULT_PRODUCTION_SERVICES, POPULAR_SERVICE_TEMPLATES } from './constants';
import { ServiceCatalogCard } from './ServiceCatalogCard';
import { ServiceBuilderRow } from './ServiceBuilderRow';
import { ActiveServicesBadgeStrip } from './ActiveServicesBadgeStrip';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import { Plus } from 'lucide-react';

interface Props {
  onSuccess: () => void;
  onClose: () => void;
  isSubmitting: boolean;
  setIsSubmitting: (submitting: boolean) => void;
  setError: (err: string) => void;
  onActiveCountChange?: (count: number) => void;
}

export function ServiceIngestForm({
  onSuccess,
  onClose,
  isSubmitting,
  setIsSubmitting,
  setError,
  onActiveCountChange,
}: Props) {
  const propertyBranches = useHostWorkspace((state) => state.propertyBranches);
  const primaryBranch = propertyBranches[0];

  const [services, setServices] = useState<CatalogServiceItem[]>(DEFAULT_PRODUCTION_SERVICES);

  // Quick Builder state
  const customNameRef = useRef<HTMLInputElement>(null);
  const [quickName, setQuickName] = useState('');
  const [quickPrice, setQuickPrice] = useState('');
  const [quickCategory, setQuickCategory] = useState<ServiceCategory>('Services');
  const [quickDuration, setQuickDuration] = useState<ServiceBillingDuration>('Per Day');

  const activeServices = services.filter((s) => s.isActive);

  // Inform parent modal about active count for dynamic submit button label
  React.useEffect(() => {
    onActiveCountChange?.(activeServices.length);
  }, [activeServices.length, onActiveCountChange]);

  const handleToggle = (id: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
    );
  };

  const handlePriceChange = (id: string, price: number) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, price } : s))
    );
  };

  const handleDurationChange = (id: string, duration: ServiceBillingDuration) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, duration } : s))
    );
  };

  const handleProviderChange = (id: string, providerType: ServiceProviderType) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, providerType } : s))
    );
  };

  const handleRemoveCustom = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const handleApplyTemplate = (tmpl: ServiceQuickTemplate) => {
    const existing = services.find(
      (s) => s.name.toLowerCase() === tmpl.name.toLowerCase()
    );
    if (existing) {
      setServices((prev) =>
        prev.map((s) =>
          s.id === existing.id
            ? { ...s, isActive: !s.isActive, price: s.price || tmpl.price }
            : s
        )
      );
    } else {
      const newService: CatalogServiceItem = {
        id: `srv_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: tmpl.name,
        price: tmpl.price,
        category: tmpl.category,
        duration: tmpl.duration,
        providerType: tmpl.providerType,
        description: tmpl.description,
        isActive: true,
        isCustom: true,
      };
      setServices((prev) => [newService, ...prev]);
    }
  };

  const handleAddQuickCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickName.trim()) return;

    const parsedPrice = parseFloat(quickPrice);
    const newService: CatalogServiceItem = {
      id: `srv_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: quickName.trim(),
      price: isNaN(parsedPrice) ? 0 : Math.max(0, parsedPrice),
      category: quickCategory,
      duration: quickDuration,
      providerType: 'in_house',
      description: 'Bespoke custom guest service created by host.',
      isActive: true,
      isCustom: true,
    };

    setServices((prev) => [newService, ...prev]);
    setQuickName('');
    setQuickPrice('');
    setQuickCategory('Services');
    setQuickDuration('Per Day');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const itemsToSubmit = [...activeServices];

    // If no services were ticked in the grid, but the user typed a custom service in the builder:
    if (itemsToSubmit.length === 0) {
      if (!quickName.trim()) {
        setError('Please tick at least one service from the catalog or enter a custom add-on name.');
        return;
      }
      const singlePrice = parseFloat(quickPrice) || 0;
      itemsToSubmit.push({
        id: `srv_single_${Date.now()}`,
        name: quickName.trim(),
        price: singlePrice,
        category: quickCategory,
        duration: quickDuration,
        providerType: 'in_house',
        description: 'Custom guest service.',
        isActive: true,
      });
    }

    setIsSubmitting(true);
    setError('');

    try {
      const bulkPayload = {
        items: itemsToSubmit.map((s) => ({
          name: s.name.trim(),
          item_type: 'service',
          category: s.category,
          price: Number(s.price) || 0,
          description: s.description || '',
          image_url: s.imageUrl || null,
          metadata: {
            duration: s.duration,
            provider_type: s.providerType,
            billing_type: s.duration.toLowerCase().includes('day')
              ? 'per_day'
              : s.duration.toLowerCase().includes('night')
              ? 'per_night'
              : 'per_stay',
          },
        })),
      };

      const res = await fetch('/api/host/catalog/bulk-insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkPayload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save services to catalog.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while saving services.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form id="service-ingest-form" onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        {/* 1. Header with Badge count and Quick Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-100 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-serif text-lg font-medium text-zinc-950">
                Paid Add-Ons & Services
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                activeServices.length > 0 
                  ? 'bg-zinc-900 text-white' 
                  : 'bg-zinc-100 text-zinc-500'
              }`}>
                {activeServices.length} Enabled
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Configure optional extra services, rentals, and meals billed per night, per person, or per stay.
            </p>
          </div>

          <button
            type="button"
            onClick={() => customNameRef.current?.focus()}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 px-3.5 py-2 text-xs font-semibold text-zinc-800 transition-colors shadow-xs w-fit cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-zinc-500" />
            + New Custom Add-on
          </button>
        </div>

        {/* 2. Quick One-Click Template Chips & Custom Add-on Input */}
        <ServiceBuilderRow
          customNameRef={customNameRef}
          quickName={quickName}
          setQuickName={setQuickName}
          quickPrice={quickPrice}
          setQuickPrice={setQuickPrice}
          quickCategory={quickCategory}
          setQuickCategory={setQuickCategory}
          quickDuration={quickDuration}
          setQuickDuration={setQuickDuration}
          onAddQuickCustom={handleAddQuickCustom}
          onApplyTemplate={handleApplyTemplate}
          templates={POPULAR_SERVICE_TEMPLATES}
          services={services}
        />

        {/* 3. Active Add-ons Badges Strip */}
        <ActiveServicesBadgeStrip
          activeServices={activeServices}
          onDeactivate={handleToggle}
        />

        {/* 4. Chargeable Add-ons Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              AVAILABLE SERVICE ADD-ONS ({services.length})
            </p>
            <span className="text-[11px] text-zinc-400">
              Select checkmarks to activate and adjust pricing
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <ServiceCatalogCard
                key={service.id}
                service={service}
                onToggle={handleToggle}
                onPriceChange={handlePriceChange}
                onDurationChange={handleDurationChange}
                onProviderChange={handleProviderChange}
                onRemoveCustom={handleRemoveCustom}
              />
            ))}
          </div>
        </div>
      </div>
    </form>
  );
}
