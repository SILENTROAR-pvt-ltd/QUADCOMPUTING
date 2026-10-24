'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { KitchenTicket } from '@/lib/utils/kitchen';
import { KitchenBoardHeader } from '@/components/kitchen/KitchenBoardHeader';
import { KitchenBoardFilters, type BoardTab } from '@/components/kitchen/KitchenBoardFilters';
import { KotTicketCard } from '@/components/kitchen/KotTicketCard';
import { resolveStation, type KitchenStation } from '@/components/kitchen/kitchen-station';
import { arrivingTicket, kitchenTickets } from '@/lib/showcase/demo-pos';
import { Chrome } from './ShowcaseChrome';

const active = (t: KitchenTicket) => t.status !== 'SERVED' && t.status !== 'CANCELLED';

declare global { interface Window { __showcaseStep?: (step: number) => void } }

/**
 * The live kitchen board from its real parts, with tonight's tickets kept in memory: the kitchen starts a ticket, ticks
 * dishes off and marks it ready, and a new order lands mid-recording (the recorder calls window.__showcaseStep(1)).
 */
export function KitchenScreen() {
  const [now] = useState(() => Date.now());
  const [tickets, setTickets] = useState<KitchenTicket[]>(() => kitchenTickets(now));
  const [tab, setTab] = useState<BoardTab>('ACTIVE');
  const [station, setStation] = useState<'ALL' | KitchenStation>('ALL');

  useEffect(() => {
    window.__showcaseStep = (step) => { if (step === 1) setTickets((list) => (list.some((t) => t.id === 'k4') ? list : [...list, arrivingTicket(Date.now())])); };
    return () => { delete window.__showcaseStep; };
  }, []);

  const onStatus = useCallback(async (id: string, to: KitchenTicket['status']) => {
    const at = new Date().toISOString();
    setTickets((list) => list.map((t) => (t.id === id ? { ...t, status: to, updated_at: at, status_history: [...(t.status_history ?? []), { from: t.status, to, at }] } : t)));
    return true;
  }, []);
  const onToggleItem = useCallback(async (id: string, idx: number) => {
    setTickets((list) => list.map((t) => (t.id === id ? { ...t, items: t.items.map((it, i) => (i === idx ? { ...it, completed: !it.completed } : it)) } : t)));
    return true;
  }, []);

  const inTab = useMemo(() => tickets.filter((t) => (tab === 'ACTIVE' ? active(t) : tab === 'READY' ? t.status === 'READY' : t.status === 'SERVED')), [tickets, tab]);
  const counts = useMemo(() => {
    const c: Record<KitchenStation, number> = { Kitchen: 0, Bar: 0, Grill: 0 };
    for (const t of inTab) c[resolveStation(t)] += 1;
    return c;
  }, [inTab]);
  const visible = inTab.filter((t) => station === 'ALL' || resolveStation(t) === station);

  return (
    <Chrome tab="kitchen" wide>
      <KitchenBoardHeader isSubscribed isLoading={false} onRefresh={() => undefined} />
      <KitchenBoardFilters tab={tab} onTab={setTab} activeCount={tickets.filter(active).length} readyCount={tickets.filter((t) => t.status === 'READY').length}
        servedCount={tickets.filter((t) => t.status === 'SERVED').length} station={station} onStation={setStation} stationCounts={counts} />
      <div className="grid grid-cols-4 gap-4">
        {visible.map((t) => (
          <KotTicketCard key={t.id} ticket={t} station={resolveStation(t)} nowMs={Date.now()} onStatus={onStatus} onToggleItem={onToggleItem} />
        ))}
      </div>
    </Chrome>
  );
}
