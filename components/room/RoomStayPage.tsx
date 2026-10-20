'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { StayShell, StayNotice, StaySpinner, stayButton } from '@/components/stay/StayShell';
import { useRoomStay } from './useRoomStay';
import { useRoomMenu } from './useRoomMenu';
import { RoomGate } from './RoomGate';
import { RoomHeader } from './RoomHeader';
import { RoomMenu } from './RoomMenu';
import { RoomTray } from './RoomTray';
import { RoomServices } from './RoomServices';
import { RoomFolio } from './RoomFolio';

type Tab = 'dine' | 'services' | 'bill';

/** /room/[code]: the guest's own page for the stay, from the QR card in the room. */
export function RoomStayPage({ code }: { code: string }) {
  const search = useSearchParams();
  const stay = useRoomStay(code);
  const [tab, setTab] = useState<Tab>('dine');
  const refresh = useCallback(() => void stay.reload(true), [stay]);
  const businessId = stay.data?.verified ? stay.data.business.id : null;
  const menu = useRoomMenu(businessId, code, refresh);

  if (stay.loading && !stay.data) return <StayShell><StaySpinner label="Opening your room" /></StayShell>;
  if (stay.error || !stay.data) {
    return <StayShell><div className="py-16 text-center"><h2 className="font-serif text-2xl text-white">This room link is not valid</h2><p className="mt-2 text-sm text-neutral-400">{stay.error}</p></div></StayShell>;
  }

  const d = stay.data;
  const title = `Room ${d.room.room_number} · ${d.business.name}`;
  if (!d.occupied) {
    return (
      <StayShell eyebrow="Your room" title={title}>
        <StayNotice>No stay is checked in to this room right now. If you have just arrived, the desk (or self check-in) will link this card to your stay.</StayNotice>
        {d.business.slug && <Link href={`/stay/${encodeURIComponent(d.business.slug)}`} className={`${stayButton.ghost} mt-6`}>See rooms and check in</Link>}
      </StayShell>
    );
  }
  if (!d.verified) return <StayShell eyebrow="Your room" title={title}><RoomGate roomNumber={d.room.room_number} venueName={d.business.name} onVerify={stay.verify} /></StayShell>;

  const canOrder = d.dining.enabled && d.dining.open;
  const tabs: Array<{ id: Tab; label: string }> = [{ id: 'dine', label: d.dining.enabled ? 'Dine in' : 'Menu' }, { id: 'services', label: 'Services' }, { id: 'bill', label: 'My bill' }];

  return (
    <StayShell eyebrow="Your room" title={title}>
      <div className="space-y-5">
        {search.get('welcome') && <StayNotice tone="good">You are checked in. This page is yours for the stay: order food to the room, ask for anything, and see your bill.</StayNotice>}
        <RoomHeader data={d} />
        <nav className="flex gap-2 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-1">
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`flex-1 rounded-xl py-2.5 text-sm transition ${tab === t.id ? 'bg-white font-semibold text-neutral-950' : 'text-neutral-400 hover:text-white'}`}>{t.label}</button>
          ))}
        </nav>
        {tab === 'dine' && <RoomMenu dishes={menu.dishes} categories={menu.categories} loading={menu.loading} tray={menu.tray} canOrder={canOrder} closedMessage={d.dining.enabled ? d.dining.message : 'In-room dining is not offered here'} onAdd={menu.add} />}
        {tab === 'services' && <RoomServices onRequest={stay.request} />}
        {tab === 'bill' && <RoomFolio folio={d.folio} checkoutTime={d.business.checkout_time} />}
      </div>
      {menu.toast && <div role="status" className="fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-full border border-neutral-700 bg-neutral-900 px-4 py-2 text-xs text-white shadow-xl">{menu.toast}</div>}
      {tab === 'dine' && (
        <RoomTray roomNumber={d.room.room_number} lines={menu.lines} total={menu.total} count={menu.count} note={menu.note} setNote={menu.setNote}
          placing={menu.placing} canOrder={canOrder} onAdd={menu.add} onPlace={menu.placeOrder} onClear={menu.clear} />
      )}
    </StayShell>
  );
}
