'use client';

import { useState } from 'react';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';

type FilterCategory = 'All' | 'food_beverage' | 'accommodation' | 'service';
type AdjustmentMode = 'percentage' | 'flat';

interface BulkPricingBarProps {
  onSuccess: () => void;
  onClose: () => void;
}

export function BulkPricingBar({ onSuccess, onClose }: BulkPricingBarProps) {
  const propertyBranches = useHostWorkspace((state) => state.propertyBranches);
  const serviceCatalog = useHostWorkspace((state) => state.serviceCatalog);
  const profile = useHostWorkspace((state) => state.profile);
  const hasAccommodationEnabled = profile?.offersAccommodation ?? false;
  
  const [category, setCategory] = useState<FilterCategory>('All');
  const [mode, setMode] = useState<AdjustmentMode>('percentage');
  const [value, setValue] = useState<string>('');
  
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const activeItemsCount = serviceCatalog.filter(
    (item) => item.status !== 'archived' && (category === 'All' || item.kind === category)
  ).length;

  const handleExecute = async () => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) {
      setError('Please enter a valid number.');
      setIsConfirming(false);
      return;
    }

    if (activeItemsCount === 0) {
      setError('No active items found in this category.');
      setIsConfirming(false);
      return;
    }

    // The API uses locationIds
    const locationIds = propertyBranches.map(b => b.id);

    if (locationIds.length === 0) {
      setError('No business locations found.');
      setIsConfirming(false);
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    try {
      const res = await fetch('/api/host/catalog/bulk-price-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationIds,
          category,
          mode,
          value: numericValue
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to execute bulk update.');
      }

      setSuccess(`Successfully updated prices for ${activeItemsCount} items.`);
      setTimeout(() => {
        setSuccess('');
        onClose();
        setIsConfirming(false);
        setValue('');
      }, 3000);
      
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setIsConfirming(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-100">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
          </div>
          <div>
            <h3 className="font-serif text-lg font-medium text-zinc-900">Flash Pricing Engine</h3>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Apply bulk modifications to {activeItemsCount} {category === 'All' ? 'Total' : category} items
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-black">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-700 font-medium">
          {success}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4 items-end">
        
        <div className="sm:col-span-1">
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Target Category</label>
          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value as FilterCategory)}
            className="w-full appearance-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="All">All Categories</option>
            <option value="food_beverage">Food & Bev</option>
            {hasAccommodationEnabled && <option value="accommodation">Accommodation</option>}
            <option value="service">Services</option>
          </select>
        </div>

        <div className="sm:col-span-1">
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Adjustment Mode</label>
          <div className="flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
            <button
              onClick={() => setMode('percentage')}
              className={`flex-1 rounded-lg py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${mode === 'percentage' ? 'bg-white shadow-sm text-black' : 'text-zinc-500 hover:text-black'}`}
            >
              Percentage (%)
            </button>
            <button
              onClick={() => setMode('flat')}
              className={`flex-1 rounded-lg py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${mode === 'flat' ? 'bg-white shadow-sm text-black' : 'text-zinc-500 hover:text-black'}`}
            >
              Flat Rate (₹)
            </button>
          </div>
        </div>

        <div className="sm:col-span-1">
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Modifier Value</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-zinc-400">
              {mode === 'percentage' ? '%' : '₹'}
            </span>
            <input 
              type="number" 
              placeholder={mode === 'percentage' ? "-10 or 15" : "-50 or 100"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 pr-4 font-mono text-sm text-zinc-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
        </div>

        <div className="sm:col-span-1">
          {isConfirming ? (
            <div className="flex gap-2">
              <button 
                onClick={() => setIsConfirming(false)}
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-zinc-100 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-600 transition-colors hover:bg-zinc-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleExecute}
                disabled={isSubmitting}
                className="flex-[2] rounded-xl bg-red-600 py-3 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Syncing...
                  </span>
                ) : (
                  'Confirm Update'
                )}
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsConfirming(true)}
              disabled={!value || isNaN(parseFloat(value))}
              className="w-full rounded-xl bg-zinc-950 py-3 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm transition-transform hover:bg-black active:scale-[0.98] disabled:opacity-50"
            >
              Apply Bulk Update
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
