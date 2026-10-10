import React from 'react';
import type { KitchenTicket } from '@/lib/utils/kitchen';

export function formatCleanDestination(rawDest: string, isRoomService: boolean): string {
  if (!rawDest) return isRoomService ? 'Room Service' : 'Takeaway';
  const clean = rawDest.replace(/\s*\([^)]*add-on[^)]*\)/gi, '').trim();
  const tableMatch = clean.match(/^T-?0*(\d+)$/i);
  if (tableMatch) return `Table ${tableMatch[1]}`;
  const roomMatch = clean.match(/^R-?0*(\d+)$/i);
  if (roomMatch) return `Room ${roomMatch[1]}`;
  return clean;
}

export function formatTicketNumber(rawNum: string): { displayNum: string; isAddon: boolean } {
  const isAddon = /add/i.test(rawNum);
  const displayNum = rawNum ? rawNum.replace(/-ADD$/i, '') : 'KOT';
  return { displayNum, isAddon };
}

export function getTimerAlertColor(isDelivered: boolean, minutes: number): string {
  if (isDelivered) return 'text-neutral-500';
  if (minutes >= 20) return 'text-rose-600 font-bold animate-pulse';
  if (minutes >= 12) return 'text-amber-600 font-semibold';
  return 'text-emerald-600 font-medium';
}

export function getCardBorderClass(status: KitchenTicket['status']): string {
  switch (status) {
    case 'READY':
      return 'border-emerald-300 ring-2 ring-emerald-100/80';
    case 'PREPARING':
      return 'border-amber-300/80 ring-1 ring-amber-100/50';
    case 'PENDING':
      return 'border-neutral-200/90';
    case 'SERVED':
      return 'border-neutral-200/60 bg-neutral-50/30';
    default:
      return 'border-neutral-200';
  }
}
