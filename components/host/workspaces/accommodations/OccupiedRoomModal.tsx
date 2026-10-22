'use client';

import React, { useEffect, useState } from 'react';
import type { PhysicalRoom } from '@/types';
import { History, User, Gift } from 'lucide-react';
import { OccupiedGuestDossier } from './occupied/OccupiedGuestDossier';
import { OccupiedRoomOrders } from './occupied/OccupiedRoomOrders';
import { OccupiedRoomFolio } from './occupied/OccupiedRoomFolio';
import { OccupiedRoomHistory } from './occupied/OccupiedRoomHistory';
import { printOccupiedFolio } from './occupied/printOccupiedFolio';
import { useOccupiedRoomDossier } from './occupied/useOccupiedRoomDossier';
import { OccupiedRoomHeader } from './occupied/OccupiedRoomHeader';
import { IdProofPanel } from './occupied/IdProofPanel';
import { LateCheckoutPanel } from './occupied/LateCheckoutPanel';
import { CheckoutRequestPanel } from './occupied/CheckoutRequestPanel';
import { OccupiedRoomRequests } from './occupied/OccupiedRoomRequests';
import { CollectSheet } from './bookings/collect/CollectSheet';
import { useStaySettings } from './bookings/useStaySettings';
import type { CollectSpec } from './bookings/collect/useCollect';

interface Props {
  room: PhysicalRoom | null;
  isOpen: boolean;
  onClose: () => void;
  onRoomUpdated: () => void;
  onNavigateToBilling?: (invoiceData: any) => void;
  /** Opened straight after a check-in where the desk chose "pay now": the payment sheet comes up at once, for this amount (null: the whole stay). */
  payNowOnOpen?: boolean;
  payNowAmount?: number | null;
  onShowToast?: (msg: string) => void;
}

/** An in-house guest: who they are, what they have ordered, the running folio, payments during the stay, and checkout. */
export function OccupiedRoomModal({ room, isOpen, onClose, onRoomUpdated, onNavigateToBilling, payNowOnOpen = false, payNowAmount = null, onShowToast }: Props) {
  const [activeTab, setActiveTab] = useState<'dossier' | 'history'>('dossier');
  const [collect, setCollect] = useState<CollectSpec | null>(null);
  const { settings } = useStaySettings();
  const d = useOccupiedRoomDossier(room, isOpen, onRoomUpdated, onClose, onNavigateToBilling);

  useEffect(() => { setActiveTab('dossier'); setCollect(payNowOnOpen && room ? { kind: 'room', roomId: room.id, purpose: 'stay', amount: payNowAmount } : null); }, [room?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !collect) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, collect]);

  if (!isOpen || !room || !d.activeRoom) return null;
  const r = d.activeRoom;
  const print = () => printOccupiedFolio({ room: r, orders: d.actualRoomServiceOrders, billingSummary: d.effectiveBillingSummary });
  const refresh = () => { onRoomUpdated(); void d.loadDossier(r.id); };
  const takePayment = () => setCollect({ kind: 'room', roomId: r.id, purpose: 'balance' });
  const tab = (id: 'dossier' | 'history') =>
    `flex items-center gap-1.5 border-b-2 py-2.5 transition-colors cursor-pointer ${activeTab === id ? 'border-neutral-950 font-semibold text-neutral-950' : 'border-transparent text-neutral-500 hover:text-neutral-900'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-950/30 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center sm:p-6">
      <div className="fixed inset-0" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={`Room ${r.room_number}`}
        className="relative z-10 flex h-[100dvh] w-full flex-col overflow-hidden bg-neutral-50 text-neutral-900 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:h-auto sm:max-h-[94vh] sm:max-w-4xl sm:rounded-3xl sm:border sm:border-neutral-200">
        <OccupiedRoomHeader activeRoom={r} isEditingRoomNumber={d.isEditingRoomNumber} editedRoomNumber={d.editedRoomNumber} isSavingRoomNumber={d.isSavingRoomNumber}
          onSetEditedRoomNumber={d.setEditedRoomNumber} onSetIsEditingRoomNumber={d.setIsEditingRoomNumber} onSaveRoomNumber={d.handleSaveRoomNumber} onPrint={print} onClose={onClose} />

        <div role="tablist" className="flex shrink-0 gap-5 border-b border-neutral-200 bg-white px-6 text-xs">
          <button type="button" role="tab" aria-selected={activeTab === 'dossier'} onClick={() => setActiveTab('dossier')} className={tab('dossier')}><User className="h-3.5 w-3.5" /> Guest &amp; folio</button>
          <button type="button" role="tab" aria-selected={activeTab === 'history'} onClick={() => setActiveTab('history')} className={tab('history')}><History className="h-3.5 w-3.5" /> Stay history ({d.stayLogs.length})</button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-7">
          {d.error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800">{d.error}</p>}
          {activeTab === 'dossier' ? (
            <>
              {r.is_celebration && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <Gift className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Celebrating: {r.celebration_type || 'a special occasion'}</p>
                    <p className="text-xs text-amber-800">{r.celebration_note ? `“${r.celebration_note}”` : 'Guests are celebrating during this stay.'}</p>
                  </div>
                </div>
              )}
              <CheckoutRequestPanel room={r} balance={d.isLoading ? null : Number(d.effectiveBillingSummary?.grandTotalPayable ?? 0)}
                onSettle={d.handleCheckoutAndSettle} settling={d.isCheckingOut} onTakePayment={takePayment} onChanged={refresh} />
              <OccupiedGuestDossier room={r} />
              <IdProofPanel room={r} onVerified={refresh} />
              <LateCheckoutPanel room={r} onChanged={refresh} />
              <OccupiedRoomRequests roomId={r.id} />
              <OccupiedRoomOrders orders={d.actualRoomServiceOrders} tickets={d.tickets} roomNumber={r.room_number} />
              {d.isLoading
                ? <div className="h-64 animate-pulse rounded-2xl border border-neutral-200 bg-white" aria-busy="true" />
                : <OccupiedRoomFolio billingSummary={d.effectiveBillingSummary} folioLines={d.folioLines} ordersCount={d.actualRoomServiceOrders.length}
                    onPrintFolio={print} onOpenSettlement={d.handleCheckoutAndSettle} onTakePayment={takePayment} isCheckingOut={d.isCheckingOut} />}
            </>
          ) : (
            <OccupiedRoomHistory stayLogs={d.stayLogs} guestName={r.guest_name || ''} roomNumber={r.room_number} />
          )}
        </div>
      </div>
      {collect && <CollectSheet spec={collect} categories={[]} settings={settings} onClose={() => setCollect(null)} onToast={(m) => onShowToast?.(m)} onRecorded={refresh} />}
    </div>
  );
}
