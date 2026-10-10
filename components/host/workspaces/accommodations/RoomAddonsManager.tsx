'use client';

import React, { useState, useRef } from 'react';
import type { RoomAddon, RoomAddonBillingType } from '@/types';
import { Plus } from 'lucide-react';
import { AddonCard } from './addons/AddonCard';
import { AddonBuilderRow } from './addons/AddonBuilderRow';
import { ActiveAddonsBadgeStrip } from './addons/ActiveAddonsBadgeStrip';

export const DEFAULT_ADDONS: RoomAddon[] = [
  { id: 'a1', name: 'Extra Mattress', price: 500, isActive: false, billingType: 'per_night' },
  { id: 'a2', name: 'Breakfast (CP)', price: 350, isActive: false, billingType: 'per_person_per_day' },
  { id: 'a3', name: 'Lunch', price: 450, isActive: false, billingType: 'per_person_per_day' },
  { id: 'a4', name: 'Dinner', price: 550, isActive: false, billingType: 'per_person_per_day' },
  { id: 'a5', name: 'Airport Transfer', price: 1500, isActive: false, billingType: 'per_stay' },
  { id: 'a6', name: 'Early Check-In', price: 500, isActive: false, billingType: 'per_stay' },
  { id: 'a7', name: 'Late Check-Out', price: 500, isActive: false, billingType: 'per_stay' },
  { id: 'a8', name: 'Laundry & Pressing', price: 300, isActive: false, billingType: 'per_stay' },
  { id: 'a9', name: 'Bonfire & Night BBQ', price: 800, isActive: false, billingType: 'per_stay' },
  { id: 'a10', name: 'Pet Stay Fee', price: 500, isActive: false, billingType: 'per_night' },
  { id: 'a11', name: 'Candlelight Dinner Setup', price: 1200, isActive: false, billingType: 'per_stay' },
  { id: 'a12', name: 'Bicycle Rental', price: 250, isActive: false, billingType: 'per_person_per_day' }
];

export const QUICK_CUSTOM_TEMPLATES: { name: string; price: number; billingType: RoomAddonBillingType }[] = [
  { name: 'Baby Cot / Crib', price: 300, billingType: 'per_night' },
  { name: 'Driver Accommodation', price: 400, billingType: 'per_night' },
  { name: 'Spa & Steam Session', price: 1000, billingType: 'per_stay' },
  { name: 'Packed Lunch Box', price: 250, billingType: 'per_person_per_day' },
  { name: 'Guided Nature Trek', price: 600, billingType: 'per_stay' },
  { name: 'Heated Blanket', price: 200, billingType: 'per_night' }
];

interface RoomAddonsManagerProps {
  initialData?: RoomAddon[];
  onChange?: (activeAddons: RoomAddon[]) => void;
}

const BILLING_TYPE_LABELS: Record<RoomAddonBillingType, string> = {
  per_night: 'Per Night',
  per_person_per_day: 'Per Person / Day',
  per_stay: 'Per Stay'
};

export function RoomAddonsManager({ initialData = [], onChange }: RoomAddonsManagerProps) {
  const customNameRef = useRef<HTMLInputElement>(null);

  const [addons, setAddons] = useState<RoomAddon[]>(() => {
    if (initialData && initialData.length > 0) {
      const existingIds = new Set(initialData.map(a => a.id));
      const missingDefaults = DEFAULT_ADDONS.filter(d => !existingIds.has(d.id));
      return [...initialData, ...missingDefaults];
    }
    return DEFAULT_ADDONS;
  });

  const [quickName, setQuickName] = useState('');
  const [quickPrice, setQuickPrice] = useState('');
  const [quickBillingType, setQuickBillingType] = useState<RoomAddonBillingType>('per_night');

  const notifyChange = (updated: RoomAddon[]) => {
    setAddons(updated);
    if (onChange) {
      const activeList = updated.filter(a => a.isActive && a.name.trim() !== '');
      onChange(activeList);
    }
  };

  const handleToggle = (id: string) => {
    const updated = addons.map(addon =>
      addon.id === id ? { ...addon, isActive: !addon.isActive } : addon
    );
    notifyChange(updated);
  };

  const handlePriceChange = (id: string, newPrice: string) => {
    const val = parseFloat(newPrice);
    const updated = addons.map(addon =>
      addon.id === id ? { ...addon, price: isNaN(val) ? 0 : Math.max(0, val) } : addon
    );
    notifyChange(updated);
  };

  const handleBillingTypeChange = (id: string, billingType: RoomAddonBillingType) => {
    const updated = addons.map(addon =>
      addon.id === id ? { ...addon, billingType } : addon
    );
    notifyChange(updated);
  };

  const handleAddQuickCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickName.trim()) return;

    const priceNum = parseFloat(quickPrice);
    const newAddon: RoomAddon = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: quickName.trim(),
      price: isNaN(priceNum) ? 0 : Math.max(0, priceNum),
      isActive: true,
      billingType: quickBillingType
    };

    const updated = [...addons, newAddon];
    setQuickName('');
    setQuickPrice('');
    setQuickBillingType('per_night');
    notifyChange(updated);
  };

  const handleApplyTemplate = (tmpl: { name: string; price: number; billingType: RoomAddonBillingType }) => {
    const existing = addons.find(a => a.name.toLowerCase() === tmpl.name.toLowerCase());
    if (existing) {
      const updated = addons.map(a =>
        a.id === existing.id ? { ...a, isActive: true, price: existing.price || tmpl.price } : a
      );
      notifyChange(updated);
    } else {
      const newAddon: RoomAddon = {
        id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: tmpl.name,
        price: tmpl.price,
        isActive: true,
        billingType: tmpl.billingType
      };
      const updated = [...addons, newAddon];
      notifyChange(updated);
    }
  };

  const handleRemoveCustom = (id: string) => {
    const updated = addons.filter(a => a.id !== id);
    notifyChange(updated);
  };

  const handleDeactivateBadge = (id: string) => {
    const updated = addons.map(a => a.id === id ? { ...a, isActive: false } : a);
    notifyChange(updated);
  };

  const activeAddons = addons.filter(a => a.isActive);

  return (
    <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
      {/* 1. Header with Badge count and Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base sm:text-lg font-semibold tracking-tight text-neutral-900">
              Paid Add-Ons & Services
            </h3>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${activeAddons.length > 0
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-500'
              }`}>
              {activeAddons.length} Enabled
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure optional extra beds, meals, and services billed per night, per person, or per stay.
          </p>
        </div>

        <button
          type="button"
          onClick={() => customNameRef.current?.focus()}
          className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-900 transition-colors shadow-2xs w-fit cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5 text-neutral-500" />
          <span>New Custom Add-on</span>
        </button>
      </div>

      {/* 2. Quick One-Click Template Chips & Custom Add-on Input */}
      <AddonBuilderRow
        customNameRef={customNameRef}
        quickName={quickName}
        setQuickName={setQuickName}
        quickPrice={quickPrice}
        setQuickPrice={setQuickPrice}
        quickBillingType={quickBillingType}
        setQuickBillingType={setQuickBillingType}
        onAddQuickCustom={handleAddQuickCustom}
        onApplyTemplate={handleApplyTemplate}
        templates={QUICK_CUSTOM_TEMPLATES}
        addons={addons}
      />

      {/* 3. Active Add-ons Badges Strip */}
      <ActiveAddonsBadgeStrip
        activeAddons={activeAddons}
        billingTypeLabels={BILLING_TYPE_LABELS}
        onDeactivate={handleDeactivateBadge}
      />

      {/* 4. Chargeable Add-ons Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Available Service Add-Ons ({addons.length})
          </p>
          <span className="text-[11px] text-zinc-400">
            Select checkmarks to activate and adjust pricing
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {addons.map((addon) => (
            <AddonCard
              key={addon.id}
              addon={addon}
              billingTypeLabels={BILLING_TYPE_LABELS}
              onToggle={handleToggle}
              onPriceChange={handlePriceChange}
              onBillingTypeChange={handleBillingTypeChange}
              onRemoveCustom={handleRemoveCustom}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
