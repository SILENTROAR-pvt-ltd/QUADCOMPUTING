import { defaultGstRate } from '@/lib/utils/gst-rates';

export function formatCatalogItems(combinedCatalog: any[], roomCategories: any[]) {
  const formattedCatalog = combinedCatalog.map((item: any) => {
    let category = item.category || 'Services';
    const itemType = (item.item_type || (item.category?.toLowerCase().includes('accommodation') ? 'room' : 'food')).toLowerCase();

    if (itemType === 'food' || itemType === 'beverage' || itemType === 'drink') {
      category = item.category || 'F&B';
    } else if (itemType === 'room' || itemType === 'accommodation') {
      category = 'Accommodations';
    }

    return {
      id: item.id,
      name: item.name,
      price: Number(item.price) || 0,
      tax_rate: typeof item.metadata?.tax_rate === 'number' ? item.metadata.tax_rate : defaultGstRate({ item_type: itemType }),
      category,
      item_type: itemType,
      is_available: item.is_available ?? true,
      image_url: item.image_url || null,
      description: item.description || '',
      metadata: item.metadata || {},
    };
  });

  const addonServices: any[] = [];
  const seenAddonNames = new Set<string>();

  roomCategories.forEach((rc: any) => {
    const rawList = Array.isArray(rc.addons) && rc.addons.length > 0 ? rc.addons : Array.isArray(rc.available_addons) ? rc.available_addons : [];
    rawList.forEach((a: any) => {
      const aName = (a.name || '').trim();
      const aKey = aName.toLowerCase();
      if (aName && !seenAddonNames.has(aKey)) {
        seenAddonNames.add(aKey);
        addonServices.push({
          id: a.id || `addon_${rc.id}_${aKey.replace(/\s+/g, '_')}`,
          name: aName,
          price: Number(a.price) || 0,
          tax_rate: 0.18,
          category: 'Services',
          item_type: 'service',
          is_available: a.isActive ?? true,
          image_url: null,
          description: `Add-on (${rc.name}) • ${a.billingType ? a.billingType.replace(/_/g, ' ') : 'per stay'}`,
          metadata: { billing_type: a.billingType || 'per_stay', source: 'room_category_addon', room_category_id: rc.id },
        });
      }
    });
  });

  const allItems = [...formattedCatalog, ...addonServices];
  const categorySet = new Set<string>();
  allItems.forEach((it) => it.category && categorySet.add(it.category));

  return { allItems, categories: ['All', ...Array.from(categorySet)] };
}
