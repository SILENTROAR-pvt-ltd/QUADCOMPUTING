import type { BusinessLocation, FoodMenuItem, HostProfile, RoomTariffItem } from '@/types/host';

export function generateUniqueHostId(prefix = 'CF'): string {
  const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
  const timeCode = Date.now().toString(36).substring(4).toUpperCase();
  return `HOST-${prefix}-${randomHex}-${timeCode}`;
}

export function calculateProfileScore(
  profile: HostProfile,
  businesses: BusinessLocation[],
  foodMenu: FoodMenuItem[],
  roomTariffs: RoomTariffItem[],
): number {
  let score = 0;
  if (profile.fullName) score += 15;
  if (profile.email) score += 10;
  if (profile.bio) score += 15;
  if (profile.bannerUrl) score += 15;
  if (businesses.length > 0) score += 15;
  if (foodMenu.length > 0) score += 15;
  if (roomTariffs.length > 0) score += 15;
  return Math.min(score, 100);
}
