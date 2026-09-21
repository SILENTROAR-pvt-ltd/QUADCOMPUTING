'use client';

import { useState, useMemo } from 'react';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import { useDrawer } from '@/lib/store/drawer.store';
import { ManualIngestModal } from './catalog/ManualIngestModal';
import { AiIngestModal } from './catalog/AiIngestModal';
import { EditItemModal } from './catalog/EditItemModal';
import { BulkPricingBar } from './catalog/BulkPricingBar';
import type { CatalogItem } from '@/types';

type FilterCategory = 'All' | 'food_beverage' | 'accommodation' | 'service';
type SortOption = 'A-Z' | 'Z-A' | 'Price-Low-High' | 'Price-High-Low';

export function CatalogWorkspace() {
  const serviceCatalog = useHostWorkspace((state) => state.serviceCatalog);
  const propertyBranches = useHostWorkspace((state) => state.propertyBranches);
  const profile = useHostWorkspace((state) => state.profile);
  const openDrawer = useDrawer((state) => state.open);

  const hasAccommodationEnabled = profile?.offersAccommodation ?? false;

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [initialItemType, setInitialItemType] = useState<'food' | 'room' | 'service'>('food');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isBulkPricingOpen, setIsBulkPricingOpen] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);

  // Toolbar State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('All');
  const [sortOption, setSortOption] = useState<SortOption>('A-Z');

  const activeItems = serviceCatalog.filter(i => i.status !== 'archived' && (hasAccommodationEnabled || i.kind !== 'accommodation'));
  const defaultBranchId = propertyBranches[0]?.id || '';

  // Apply Filters & Sort
  const filteredAndSortedItems = useMemo(() => {
    let result = [...activeItems];

    // Filter by Category
    if (filterCategory !== 'All') {
      result = result.filter(item => item.kind === filterCategory);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(q) || 
        (item.description && item.description.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      const priceA = a.kind === 'food_beverage' ? a.price.amountMinor : a.nightlyRate.amountMinor;
      const priceB = b.kind === 'food_beverage' ? b.price.amountMinor : b.nightlyRate.amountMinor;

      switch (sortOption) {
        case 'A-Z':
          return a.name.localeCompare(b.name);
        case 'Z-A':
          return b.name.localeCompare(a.name);
        case 'Price-Low-High':
          return priceA - priceB;
        case 'Price-High-Low':
          return priceB - priceA;
        default:
          return 0;
      }
    });

    return result;
  }, [activeItems, filterCategory, searchQuery, sortOption]);

  const handleIngestSuccess = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const locationIds = propertyBranches.map(b => b.id);
      
      const { data: catalogData } = await supabase
        .from('catalog_items')
        .select('*')
        .in('location_id', locationIds);
        
      if (catalogData) {
        const currentSnapshot = useHostWorkspace.getState();
        const hostId = currentSnapshot.profile?.uniqueOwnerCafeId || '';
        
        const updatedCatalog = catalogData.map(item => ({
          id: item.id,
          hostId: hostId as any,
          branchId: item.location_id,
          kind: item.item_type === 'room' ? 'accommodation' : 'food_beverage',
          name: item.name,
          description: item.description || '',
          imageUrl: item.image_url || null,
          status: item.is_available ? 'active' : 'sold_out',
          price: { amountMinor: item.price, currency: 'INR' as const },
          nightlyRate: { amountMinor: item.price, currency: 'INR' as const },
          capacity: null,
          createdAt: item.created_at,
          updatedAt: item.created_at
        }));
        
        useHostWorkspace.getState().adoptSnapshot({
          ...currentSnapshot,
          serviceCatalog: updatedCatalog as unknown as CatalogItem[]
        });
      }
    } catch (e) {
      window.location.reload();
    }
  };

  const handleAutoFillImages = async () => {
    try {
      setIsAutoFilling(true);
      const res = await fetch('/api/host/catalog/auto-fill-images', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to auto-fill images');
      
      const data = await res.json();
      if (data.updatedItems && data.updatedItems.length > 0) {
        const upsertCatalogItem = useHostWorkspace.getState().upsertCatalogItem;
        data.updatedItems.forEach((item: any) => upsertCatalogItem(item));
        alert(`Successfully assigned stock imagery to ${data.count} items`);
      } else {
        alert('No missing images found to fill.');
      }
    } catch (e: any) {
      alert(e.message || 'An error occurred during auto-fill.');
    } finally {
      setIsAutoFilling(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-zinc-900">Services & Catalog</h2>
          <p className="mt-1 text-sm text-zinc-500">Manage your menu cards, room tariffs, and service offerings.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <button
            onClick={() => setIsBulkPricingOpen((prev) => !prev)}
            className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition-all ${isBulkPricingOpen ? 'border-zinc-300 bg-zinc-100 text-black' : 'border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50'}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
            Flash Pricing Engine
          </button>
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 shadow-sm transition-all hover:bg-zinc-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            AI Menu Ingest
          </button>
          <button
            onClick={handleAutoFillImages}
            disabled={isAutoFilling}
            className="flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 disabled:opacity-50"
          >
            {isAutoFilling && (
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
            )}
            {isAutoFilling ? 'Mapping images...' : 'Smart Stock Images'}
          </button>
          <button
            onClick={() => { setInitialItemType('food'); setIsManualModalOpen(true); }}
            className="flex items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-zinc-800"
          >
            + New Catalog Item
          </button>
        </div>
      </div>

      {isBulkPricingOpen && (
        <BulkPricingBar 
          onSuccess={handleIngestSuccess} 
          onClose={() => setIsBulkPricingOpen(false)} 
        />
      )}

      {/* Advanced Filter & Sort Toolbar */}
      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm md:flex-row md:items-center md:justify-between">
        
        {/* Search */}
        <div className="relative w-full md:max-w-[280px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input 
            type="text" 
            placeholder="Search items by name or description..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-4 text-sm text-zinc-900 transition-colors focus:border-zinc-950 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950"
          />
        </div>

        {/* Category Pills */}
        <div className="flex w-full gap-2 overflow-x-auto scrollbar-hide md:w-auto md:justify-center">
          {[
            { label: 'All', value: 'All' },
            { label: 'Food & Bev', value: 'food_beverage' },
            ...(hasAccommodationEnabled ? [{ label: 'Accommodation', value: 'accommodation' }] : []),
            { label: 'Services', value: 'service' }
          ].map((pill) => (
            <button
              key={pill.value}
              onClick={() => setFilterCategory(pill.value as FilterCategory)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-[13px] font-medium transition-colors ${
                filterCategory === pill.value 
                  ? 'bg-zinc-950 text-white shadow-sm' 
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="w-full shrink-0 md:w-auto">
          <select 
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="w-full cursor-pointer appearance-none rounded-lg border border-zinc-200 bg-white py-2 pl-4 pr-10 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%233f3f46' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
          >
            <option value="A-Z">Sort: A to Z</option>
            <option value="Z-A">Sort: Z to A</option>
            <option value="Price-Low-High">Price: Low to High</option>
            <option value="Price-High-Low">Price: High to Low</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl sm:rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden min-h-[300px] sm:min-h-[400px]">
        {filteredAndSortedItems.length > 0 ? (
          <div className="divide-y divide-zinc-100">
            {filteredAndSortedItems.map((item) => (
              <div key={item.id} className="flex flex-col gap-4 p-4 sm:p-6 sm:flex-row sm:items-center sm:justify-between hover:bg-zinc-50 transition-colors">
                <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-14 w-14 sm:h-20 sm:w-20 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-xl bg-zinc-100 border border-zinc-200">
                      <span className="text-[10px] font-bold uppercase text-zinc-400">No Img</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-serif text-base sm:text-xl font-medium text-black truncate">{item.name}</h3>
                    <p className="mt-1 text-sm text-zinc-500 line-clamp-1 max-w-xs sm:max-w-md">{item.description}</p>
                    <div className="mt-3 flex gap-2">
                      <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                        {item.kind === 'food_beverage' ? 'Food & Bev' : (item.kind === 'accommodation' ? 'Accommodation' : 'Service')}
                      </span>
                      {item.status === 'sold_out' && (
                        <span className="rounded-md bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-600">
                          Sold Out
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:mt-0 sm:flex-col sm:items-end shrink-0">
                  <p className="font-serif text-xl sm:text-2xl text-black">
                    {item.kind === 'food_beverage' 
                      ? `₹${item.price.amountMinor.toFixed(2)}` 
                      : `₹${item.nightlyRate.amountMinor.toFixed(2)}`}
                  </p>
                  <button 
                    onClick={() => setSelectedItem(item as CatalogItem)}
                    className="mt-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 transition-colors hover:text-black"
                  >
                    Edit Item
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-20 text-center h-[400px]">
            <div className="h-16 w-16 rounded-full bg-zinc-50 flex items-center justify-center mb-6">
              <span className="text-2xl">🔍</span>
            </div>
            <h3 className="font-serif text-xl text-black">No items found</h3>
            <p className="mt-2 max-w-sm text-sm text-zinc-500">
              Try adjusting your search query or filters.
            </p>
            {filterCategory === 'accommodation' && hasAccommodationEnabled && (
              <button
                onClick={() => {
                  setInitialItemType('room');
                  setIsManualModalOpen(true);
                }}
                className="mt-6 rounded-lg bg-zinc-950 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800"
              >
                + Add First Room / Stay Tariff
              </button>
            )}
          </div>
        )}
      </div>

      {isManualModalOpen && (
        <ManualIngestModal 
          onClose={() => setIsManualModalOpen(false)} 
          onSuccess={handleIngestSuccess}
          initialItemType={initialItemType}
        />
      )}

      {isAiModalOpen && (
        <AiIngestModal 
          onClose={() => setIsAiModalOpen(false)} 
          onSuccess={handleIngestSuccess}
        />
      )}

      {selectedItem && (
        <EditItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSuccess={handleIngestSuccess}
        />
      )}
    </div>
  );
}
