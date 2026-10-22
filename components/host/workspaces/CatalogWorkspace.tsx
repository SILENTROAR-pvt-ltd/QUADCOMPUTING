'use client';

import React, { useState } from 'react';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import { BulkPricingBar } from './catalog/BulkPricingBar';
import type { CatalogItem } from '@/types';
import { useCatalogData } from './catalog/hooks/useCatalogData';
import { useCatalogModals } from './catalog/hooks/useCatalogModals';
import { useCatalogFilter } from './catalog/hooks/useCatalogFilter';
import { useDishAvailability } from './catalog/hooks/useDishAvailability';
import { CatalogHeader } from './catalog/components/CatalogHeader';
import { CatalogPipelineBanner } from './catalog/components/CatalogPipelineBanner';
import { CatalogToolbar } from './catalog/components/CatalogToolbar';
import { CatalogItemCard } from './catalog/components/CatalogItemCard';
import { CatalogEmptyState } from './catalog/components/CatalogEmptyState';
import { CatalogModalsContainer } from './catalog/components/CatalogModalsContainer';
import { MenuInfoCard } from './catalog/MenuInfoCard';
import { TopPicksCard } from './catalog/TopPicksCard';
import { CatalogCategoryChips } from './catalog/components/CatalogCategoryChips';
import { DishPhotoPicker } from './catalog/images/DishPhotoPicker';
import { DishPhotoIngest } from './catalog/images/DishPhotoIngest';

interface CatalogWorkspaceProps {
  cafeId?: string;
  onNavigate?: (tab: string) => void;
}

export function CatalogWorkspace({ cafeId: propCafeId }: CatalogWorkspaceProps = {}) {
  const profile = useHostWorkspace((state) => state.profile);
  const [photoItem, setPhotoItem] = useState<CatalogItem | null>(null);
  const [dishIngestOpen, setDishIngestOpen] = useState(false);
  const hasAccommodationEnabled = profile?.offersAccommodation ?? false;

  const { activeCafeId, serviceCatalog, isLoading, isRefreshing, fetchError, refreshCatalog } = useCatalogData(propCafeId);
  const modals = useCatalogModals(refreshCatalog);
  const availability = useDishAvailability(activeCafeId);
  const { searchQuery, setSearchQuery, filterCategory, setFilterCategory, sortOption, setSortOption, activeItems, filteredAndSortedItems } = useCatalogFilter(serviceCatalog);

  const handleDirectDelete = async (item: CatalogItem) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    try {
      const res = await fetch('/api/host/catalog/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, name: item.name, metadata: (item as any).metadata || {} }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete item.');
      }
      useHostWorkspace.getState().removeCatalogItem(item.id);
      useHostWorkspace.getState().archiveCatalogItem(item.id);
      refreshCatalog();
    } catch (e: any) {
      alert(e.message || 'Failed to delete item.');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CatalogHeader
        isBulkPricingOpen={modals.isBulkPricingOpen} isAutoFilling={modals.isAutoFilling}
        onToggleBulkPricing={() => modals.setIsBulkPricingOpen((prev) => !prev)}
        onAutoFillImages={() => modals.handleAutoFillImages(refreshCatalog)}
        onOpenServicesModal={() => modals.openManualModal('service')}
        onOpenPhotoVaultModal={() => modals.setIsPhotoVaultOpen(true)}
        onOpenDishIngest={() => setDishIngestOpen(true)}
        onOpenNewItemModal={() => {
          const target = filterCategory === 'service' ? 'service' : filterCategory === 'accommodation' ? 'room' : 'food';
          modals.openManualModal(target);
        }}
      />

      {modals.isBulkPricingOpen && (
        <BulkPricingBar onSuccess={refreshCatalog} onClose={() => modals.setIsBulkPricingOpen(false)} />
      )}

      <CatalogPipelineBanner
        activeCafeId={activeCafeId} itemCount={activeItems.length} fetchError={fetchError}
        isRefreshing={isRefreshing} isLoading={isLoading} onRefresh={refreshCatalog}
      />

      <TopPicksCard items={activeItems} />

      <MenuInfoCard />

      <CatalogCategoryChips items={activeItems} value={filterCategory} onChange={setFilterCategory} />

      <CatalogToolbar
        searchQuery={searchQuery} onSearchChange={setSearchQuery} filterCategory={filterCategory}
        onFilterChange={setFilterCategory} sortOption={sortOption} onSortChange={setSortOption}
        hasAccommodationEnabled={hasAccommodationEnabled}
      />

      <div className="rounded-2xl sm:rounded-3xl border border-neutral-200 bg-white shadow-xs overflow-hidden min-h-[300px]">
        {isLoading || filteredAndSortedItems.length === 0 ? (
          <CatalogEmptyState
            isLoading={isLoading} activeCafeId={activeCafeId} totalActiveItems={activeItems.length}
            searchQuery={searchQuery} filterCategory={filterCategory} fetchError={fetchError}
            onRetry={refreshCatalog} onOpenAiIngest={() => modals.setIsAiModalOpen(true)}
            onOpenManualIngest={modals.openManualModal}
            onClearFilters={() => { setSearchQuery(''); setFilterCategory('All'); }}
          />
        ) : (
          <div className="divide-y divide-neutral-100">
            {filteredAndSortedItems.map((item) => (
              <CatalogItemCard
                key={item.id} item={item} onEdit={modals.handleEditItem} onDelete={handleDirectDelete} onRecipe={modals.setRecipeItem}
                onPickPhoto={setPhotoItem} onToggleAvailable={availability.toggle} availabilityBusy={availability.busyIds.has(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      <CatalogModalsContainer modals={modals} onRefresh={refreshCatalog} activeCafeId={activeCafeId} />

      {dishIngestOpen && (
        <DishPhotoIngest onClose={() => setDishIngestOpen(false)} onDone={refreshCatalog} />
      )}

      {photoItem && (
        <DishPhotoPicker item={photoItem} onClose={() => setPhotoItem(null)} onPicked={() => { setPhotoItem(null); refreshCatalog(); }} />
      )}
    </div>
  );
}
