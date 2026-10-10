import type { Brand, ISODateString } from './host';
import type { BranchId } from './branch';

export type CatalogItemId = Brand<string, 'CatalogItemId'>;
export type CatalogItemStatus = 'active' | 'sold_out' | 'archived';
export interface Money { amountMinor: number; currency: 'INR'; }
export interface CatalogAddon { id: Brand<string, 'AddonId'>; label: string; price: Money; pricingModel: 'flat' | 'per_unit' | 'per_guest' | 'per_night'; }
interface CatalogItemBase { id: CatalogItemId; branchId: BranchId; name: string; description: string; imageUrl: string | null; status: CatalogItemStatus; addons: CatalogAddon[]; category?: string; metadata?: Record<string, any>; createdAt: ISODateString; updatedAt: ISODateString; }
export type FoodCourse = 'starter' | 'main' | 'side' | 'dessert' | 'beverage';
export type DietaryClass = 'veg' | 'non_veg' | 'vegan' | 'egg';
export interface FoodBeverageItem extends CatalogItemBase { kind: 'food_beverage'; course: FoodCourse; dietary: DietaryClass; price: Money; prepTimeMinutes: number | null; allergens: string[]; }
export type RoomType = 'standard' | 'deluxe' | 'suite' | 'villa' | 'dorm_bed';
export interface AccommodationTariff extends CatalogItemBase { kind: 'accommodation'; roomType: RoomType; nightlyRate: Money; occupancy: { adults: number; children: number }; inventoryCount: number; amenities: string[]; }
export interface ServiceItem extends CatalogItemBase { kind: 'service'; price: Money; category?: string; duration?: string; providerType?: 'in_house' | 'third_party'; }
export type CatalogItem = FoodBeverageItem | AccommodationTariff | ServiceItem;
export const isFoodBeverage = (item: CatalogItem): item is FoodBeverageItem => item.kind === 'food_beverage';
export const isAccommodation = (item: CatalogItem): item is AccommodationTariff => item.kind === 'accommodation';
export const isService = (item: CatalogItem): item is ServiceItem => item.kind === 'service';
