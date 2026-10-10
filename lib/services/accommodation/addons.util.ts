export function sanitizeCategoryAddons(rawAddons: any[]) {
  return (rawAddons || []).map((a: any, idx: number) => ({
    id: a.id || `addon_${idx}_${Date.now()}`,
    name: String(a.name || 'Extra Service').trim(),
    price: typeof a.price === 'number' ? a.price : parseFloat(a.price) || 0,
    isActive: a.isActive !== undefined ? Boolean(a.isActive) : true,
    billingType: ['per_night', 'per_person_per_day', 'per_stay'].includes(a.billingType) ? a.billingType : 'per_night',
  }));
}
