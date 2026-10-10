'use client';

import { useMemo } from 'react';
import type { PhysicalRoom, RoomAddon } from '@/types';
import { addonTotal, stayNights, type StayAddon } from '@/lib/services/accommodation/stay-folio.util';
import { DEFAULT_ADDONS } from '../RoomAddonsManager';
import { localInputToIso } from './check-in-dates';

interface QuoteInput {
  room: PhysicalRoom | null;
  checkInTime: string;
  checkOutTime: string;
  adultsCount: string;
  chosenAddonIds: string[];
  customAddons: RoomAddon[];
}

/**
 * What the stay will cost, by the same rules checkout bills with: nights by calendar date, and
 * per-person add-ons for the adults on the booking (saved on the add-on so checkout uses it too).
 */
export function useCheckInQuote({ room, checkInTime, checkOutTime, adultsCount, chosenAddonIds, customAddons }: QuoteInput) {
  const availableAddons: RoomAddon[] = useMemo(() => {
    if (!room) return [];
    const catList = room.category?.addons || room.category?.available_addons;
    const catAddons: RoomAddon[] = Array.isArray(catList) ? catList.filter((a) => a.isActive !== false) : [];
    const existing = new Set(catAddons.map((a) => a.name.toLowerCase()));
    const standard = DEFAULT_ADDONS.filter((d) => !existing.has(d.name.toLowerCase())).map((d) => ({ ...d, isActive: true }));
    return [...catAddons, ...standard, ...customAddons];
  }, [room, customAddons]);

  const adults = Math.max(1, parseInt(adultsCount, 10) || 1);
  const numNights = stayNights(localInputToIso(checkInTime), localInputToIso(checkOutTime) || undefined);
  const roomPrice = Number(room?.category?.price) || 0;
  const roomTariffTotal = roomPrice * numNights;

  const selectedAddonsList: Array<RoomAddon & StayAddon> = useMemo(
    () => availableAddons
      .filter((a) => chosenAddonIds.includes(a.id))
      .map((a) => (a.billingType === 'per_person_per_day' ? { ...a, persons: adults } : a)),
    [availableAddons, chosenAddonIds, adults],
  );
  const checkInAddonsTotal = selectedAddonsList.reduce((s, a) => s + addonTotal(a, numNights), 0);

  return {
    availableAddons,
    selectedAddonsList,
    numNights,
    roomPrice,
    roomTariffTotal,
    checkInAddonsTotal,
    estimatedTotalWithAddons: roomTariffTotal + checkInAddonsTotal,
  };
}
