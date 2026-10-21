'use client';

import React from 'react';
import { Phone, MessageCircle } from 'lucide-react';
import { frontDeskHref } from '@/lib/guest/front-desk';
import { stayButton } from '@/components/stay/StayShell';
import type { RoomState } from './useRoomStay';

interface Props { data: RoomState; variant?: 'pill' | 'card' }

/**
 * The one way to reach the desk from the room: a call, or a WhatsApp chat that opens with the room number filled in,
 * whichever the venue chose. A pill for the page header; a card for the services tab. Nothing when no number is set.
 */
export function RoomFrontDesk({ data, variant = 'pill' }: Props) {
  const desk = data.business.front_desk;
  const href = frontDeskHref(desk, data.room.room_number, data.business.name);
  if (!href) return null;
  const whatsapp = desk.mode === 'whatsapp';
  const Icon = whatsapp ? MessageCircle : Phone;
  const external = whatsapp ? { target: '_blank', rel: 'noreferrer' } : {};

  if (variant === 'pill') {
    return (
      <a href={href} {...external} className={whatsapp ? `${stayButton.ghostSm} border-emerald-200 text-emerald-800 hover:border-emerald-700 hover:bg-emerald-50` : stayButton.ghostSm}>
        <Icon className="h-3.5 w-3.5" aria-hidden /> {whatsapp ? 'WhatsApp desk' : 'Call desk'}
      </a>
    );
  }
  return (
    <a href={href} {...external} className="flex items-center gap-3 rounded-[1.5rem] border border-[#e6d9b8] bg-white p-4 shadow-[0_18px_40px_-34px_rgba(10,50,34,0.5)] transition hover:border-neutral-900">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${whatsapp ? 'bg-emerald-600 text-white' : 'bg-neutral-950 text-white'}`}><Icon className="h-5 w-5" aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-neutral-950">{whatsapp ? 'WhatsApp the front desk' : 'Call the front desk'}</span>
        <span className="block text-xs text-neutral-500">{whatsapp ? `Opens a chat with Room ${data.room.room_number} already in the message.` : 'Rings the desk straight from your phone.'}</span>
      </span>
      <span className="text-xs font-semibold text-neutral-500">{whatsapp ? 'Open' : 'Call'}</span>
    </a>
  );
}
