import { useState, useMemo, useDeferredValue } from 'react';
import type { CatalogItem } from '@/types';
import {
  isServiceEntity,
  isAccommodationEntity,
  isFoodBeverageEntity,
  isRoomAddonEntity,
  isStandaloneServiceEntity,
} from '@/lib/utils/catalog-item';
import type { FilterCategory, SortOption } from '../components/CatalogToolbar';

export function useCatalogFilter(serviceCatalog: CatalogItem[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('All');
  const [sortOption, setSortOption] = useState<SortOption>('A-Z');

  // Defer search filtering to keep the text input responsive at 60 FPS
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const activeItems = useMemo(
    () => serviceCatalog.filter((i) => i.status !== 'archived'),
    [serviceCatalog]
  );

  const filteredAndSortedItems = useMemo(() => {
    let result = [...activeItems];
    if (filterCategory.startsWith('category:')) {
      const name = filterCategory.slice('category:'.length).trim();
      result = result.filter((item) => isFoodBeverageEntity(item) && String((item as any).category || '').trim() === name);
    } else if (filterCategory !== 'All') {
      const cat = String(filterCategory).toLowerCase().trim();
      if (cat === 'service' || cat === 'services') {
        // Exclude and hide room add-ons from standalone services
        result = result.filter(isStandaloneServiceEntity);
      } else if (cat === 'accommodation' || cat === 'accommodations') {
        // Accommodations and room add-ons remain accessible here
        result = result.filter((item) => isAccommodationEntity(item) || isRoomAddonEntity(item));
      } else if (cat === 'food_beverage' || cat === 'food') {
        result = result.filter(isFoodBeverageEntity);
      }
    }
    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery.toLowerCase();
      result = result.filter(
        (item) => item.name.toLowerCase().includes(q) || (item.description && item.description.toLowerCase().includes(q))
      );
    }
    result.sort((a, b) => {
      const priceA = a.kind === 'accommodation' ? a.nightlyRate.amountMinor : a.price.amountMinor;
      const priceB = b.kind === 'accommodation' ? b.nightlyRate.amountMinor : b.price.amountMinor;
      switch (sortOption) {
        case 'A-Z': return a.name.localeCompare(b.name);
        case 'Z-A': return b.name.localeCompare(a.name);
        case 'Price-Low-High': return priceA - priceB;
        case 'Price-High-Low': return priceB - priceA;
        default: return 0;
      }
    });
    return result;
  }, [activeItems, filterCategory, deferredSearchQuery, sortOption]);

  return {
    searchQuery,
    setSearchQuery,
    filterCategory,
    setFilterCategory,
    sortOption,
    setSortOption,
    activeItems,
    filteredAndSortedItems,
  };
}
