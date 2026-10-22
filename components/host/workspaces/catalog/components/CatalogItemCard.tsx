'use client';

import React from 'react';
import type { CatalogItem } from '@/types';
import {
  isServiceEntity,
  isAccommodationEntity,
  isRoomAddonEntity,
  isStandaloneServiceEntity,
  isRecipeEligible,
} from '@/lib/utils/catalog-item';
import { DishAvailabilityToggle } from './DishAvailabilityToggle';

interface CatalogItemCardProps {
  item: CatalogItem;
  onEdit: (item: CatalogItem) => void;
  onDelete: (item: CatalogItem) => void;
  onRecipe: (item: CatalogItem) => void;
  /** Opens the photo picker for this dish. */
  onPickPhoto?: (item: CatalogItem) => void;
  /** Puts the dish on the guest menu or takes it off (dishes and services; rooms and room add-ons have their own). */
  onToggleAvailable?: (item: CatalogItem) => void;
  availabilityBusy?: boolean;
}

export const CatalogItemCard = React.memo<CatalogItemCardProps>(function CatalogItemCard({
  item,
  onEdit,
  onDelete,
  onRecipe,
  onPickPhoto,
  onToggleAvailable,
  availabilityBusy,
}) {
  const isAddon = isRoomAddonEntity(item);
  const isRoom = isAccommodationEntity(item) && !isAddon;
  const isService = isStandaloneServiceEntity(item);
  const isOff = item.status === 'sold_out';
  const canSwitch = Boolean(onToggleAvailable) && !isRoom && !isAddon;

  const priceFormatted = isRoom
    ? `₹${((item as any).nightlyRate?.amountMinor ?? (item as any).price?.amountMinor ?? 0).toFixed(2)}`
    : `₹${((item as any).price?.amountMinor ?? (item as any).nightlyRate?.amountMinor ?? 0).toFixed(2)}`;

  // A dish shows its own category (e.g. "Quick Bites"), the same name guests see on the menu.
  const dishCategory = String((item as any).category || '').trim();
  const itemTypeLabel = isAddon ? 'Room Add-on' : isService ? 'Service' : isRoom ? 'Accommodation' : dishCategory || 'Food & Bev';

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 sm:flex-row sm:items-center sm:justify-between hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-b-0">
      <div className="flex items-center gap-4 sm:gap-6 min-w-0">
        <button
          type="button"
          onClick={() => onPickPhoto?.(item)}
          aria-label={item.imageUrl ? `Change photo for ${item.name}` : `Choose a photo for ${item.name}`}
          title="Choose a photo"
          className={`group relative shrink-0 cursor-pointer rounded-xl transition-opacity ${isOff ? 'opacity-50' : ''}`}
        >
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-14 w-14 sm:h-20 sm:w-20 rounded-xl object-cover border border-neutral-200 transition group-hover:opacity-90"
            />
          ) : (
            <span className="flex h-14 w-14 sm:h-20 sm:w-20 items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 transition group-hover:border-neutral-500">
              <span className="text-[10px] font-bold uppercase text-neutral-500">Add photo</span>
            </span>
          )}
        </button>
        <div className="min-w-0">
          <h3 className={`font-serif text-base sm:text-xl font-medium truncate ${isOff ? 'text-neutral-400' : 'text-neutral-900'}`}>{item.name}</h3>
          <p className="mt-1 text-sm text-neutral-500 line-clamp-1 max-w-xs sm:max-w-md">{item.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-neutral-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-800">
              {itemTypeLabel}
            </span>
            {canSwitch ? (
              <DishAvailabilityToggle name={item.name} on={!isOff} busy={availabilityBusy} onToggle={() => onToggleAvailable?.(item)} />
            ) : isOff && (
              <span className="rounded-md bg-neutral-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500 border border-neutral-200">
                Off menu
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between sm:mt-0 sm:flex-col sm:items-end shrink-0 gap-2">
        <p className="font-serif text-xl sm:text-2xl text-neutral-900 font-medium">
          {priceFormatted}
        </p>
        <div className="flex items-center gap-3">
          {!isService && isRecipeEligible(item) && (
            <button
              onClick={() => onRecipe(item)}
              className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
            >
              🧪 Recipe
            </button>
          )}
          <button
            onClick={() => onEdit(item)}
            className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(item)}
            className="text-[11px] font-bold uppercase tracking-wider text-red-400 hover:text-red-600 transition-colors cursor-pointer"
            title="Delete item from catalog"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
});

export default CatalogItemCard;
