'use client';

import { useEffect, useState } from 'react';
import { OPEN_TABLE_EVENT, sameTable, takeOpenTableRequest } from './open-room-request';

/**
 * Selects the table a bell call named ("Table T-03 wants the waiter") once this workspace knows its tables: the
 * request made before the workspace mounted is taken on mount, a later one arrives as an event.
 */
export function useOpenTableRequest<T extends { table_number: string }>(tables: T[], select: (table: T) => void) {
  const [wanted, setWanted] = useState<string | null>(() => takeOpenTableRequest());
  useEffect(() => {
    const onOpen = (e: Event) => { takeOpenTableRequest(); setWanted(String((e as CustomEvent).detail || '')); };
    window.addEventListener(OPEN_TABLE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_TABLE_EVENT, onOpen);
  }, []);
  useEffect(() => {
    if (!wanted || tables.length === 0) return;
    const table = tables.find((t) => sameTable(t.table_number, wanted));
    setWanted(null);
    if (table) select(table);
  }, [wanted, tables, select]);
}
