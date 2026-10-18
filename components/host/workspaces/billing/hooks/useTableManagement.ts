'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { businessFilter } from '@/lib/realtime/channels';
import { nextTableNames } from '@/lib/services/table/table-zones';

export interface RestaurantTable {
  id: string;
  table_number: string;
  seating_capacity: number;
  status: 'VACANT' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';
  is_active: boolean;
  qr_code_slug?: string;
  /** The area the table sits in ("Ground floor", "Riverside"), when the venue uses areas. */
  zone?: string | null;
}

/** Said when an area was asked for before the database update that stores areas has been run. */
const ZONE_NOT_READY = 'Saved, but areas are not set up in the database yet (run the zones update).';

export function useTableManagement(onTablesChanged: () => void, businessId?: string | null) {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState('');

  const resolvedBiz = businessId || '';

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchTables = useCallback(async () => {
    try {
      const url = resolvedBiz ? `/api/host/tables?business_id=${encodeURIComponent(resolvedBiz)}&skip_cache=true` : '/api/host/tables?skip_cache=true';
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || []);
      }
    } catch (e) {
      console.error('Failed to fetch tables', e);
    } finally {
      setIsLoading(false);
    }
  }, [resolvedBiz]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  // Realtime subscription for multi-tab and multi-device synchronization
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`table_mgmt_realtime_${resolvedBiz || 'default'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables', filter: businessFilter(resolvedBiz) }, () => {
        fetchTables();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTables, resolvedBiz]);

  const handleAddSingle = async (newTableNumber: string, newCapacity: string, zone = '') => {
    if (!newTableNumber.trim()) return false;
    setIsSaving(true);
    try {
      const res = await fetch('/api/host/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_number: newTableNumber.trim().toUpperCase(),
          seating_capacity: parseInt(newCapacity) || 4,
          business_id: resolvedBiz,
          ...(zone.trim() ? { zone } : {}),
        }),
      });
      if (res.ok) {
        const out = await res.json().catch(() => ({}));
        await fetchTables();
        onTablesChanged();
        showToast(zone.trim() && out.zone_saved === false ? ZONE_NOT_READY : `Table ${newTableNumber.trim().toUpperCase()} created`);
        return true;
      }
      const err = await res.json().catch(() => ({}));
      showToast(err.error || 'Failed to create table');
      return false;
    } catch {
      showToast('Network error');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  /** Makes `count` tables under an area, numbered on from the highest T-number in use (so a second area never collides). */
  const handleBulkGenerate = async (bulkCount: string, bulkCapacity: string, zone = '') => {
    const count = parseInt(bulkCount) || 0;
    if (count <= 0 || count > 50) {
      showToast('Enter a count between 1 and 50');
      return false;
    }
    setIsSaving(true);
    const cap = parseInt(bulkCapacity) || 4;
    const names = nextTableNames(tables.map((t) => t.table_number), count);
    let created = 0;
    let zoneSaved = true;

    for (const tableNum of names) {
      try {
        const res = await fetch('/api/host/tables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table_number: tableNum,
            seating_capacity: cap,
            business_id: resolvedBiz,
            ...(zone.trim() ? { zone } : {}),
          }),
        });
        if (res.ok) {
          created++;
          if ((await res.json().catch(() => ({}))).zone_saved === false) zoneSaved = false;
        }
      } catch {}
    }

    await fetchTables();
    onTablesChanged();
    const where = zone.trim() ? ` in ${zone.trim()}` : '';
    showToast(zone.trim() && !zoneSaved ? ZONE_NOT_READY : `${created} tables generated${where} (${names[0]} to ${names[names.length - 1]})`);
    setIsSaving(false);
    return true;
  };

  const handleUpdateTable = async (id: string, num: string, cap: number, zone?: string | null) => {
    if (!cap || cap <= 0 || !num) return false;
    try {
      const res = await fetch('/api/host/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, table_number: num, seating_capacity: cap, business_id: resolvedBiz, ...(zone !== undefined ? { zone: zone ?? '' } : {}) }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || 'Failed to update');
      await fetchTables();
      onTablesChanged();
      showToast(zone && result.zone_saved === false ? ZONE_NOT_READY : 'Table updated');
      return true;
    } catch (e: any) {
      showToast(e.message || 'Failed to update');
      return false;
    }
  };

  /** Renames an area for every table in it; an empty name takes the tables out of any area. */
  const handleRenameZone = async (from: string, to: string) => {
    try {
      const res = await fetch('/api/host/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rename_zone: { from, to }, business_id: resolvedBiz }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || 'Failed to rename');
      await fetchTables();
      onTablesChanged();
      showToast(result.zone_saved === false ? ZONE_NOT_READY : to.trim() ? `${from} is now ${to.trim()}` : `${from} removed from its tables`);
      return true;
    } catch (e: any) {
      showToast(e.message || 'Failed to rename');
      return false;
    }
  };

  const handleDelete = async (id: string, tableNumber: string) => {
    if (!confirm(`Deactivate table ${tableNumber}? It will be hidden from POS.`)) return;
    try {
      const res = await fetch('/api/host/tables', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, business_id: resolvedBiz }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || 'Failed to delete');
      await fetchTables();
      onTablesChanged();
      showToast(`Table ${tableNumber} deactivated`);
    } catch (e: any) {
      showToast(e.message || 'Failed to delete');
    }
  };

  const handleUpdateStatus = async (id: string, status: string, tableNumber?: string) => {
    const normStatus = status.toUpperCase() as RestaurantTable['status'];
    // 1. Optimistic state mutation
    setTables((prev) =>
      prev.map((t) => (t.id === id || (tableNumber && t.table_number === tableNumber) ? { ...t, status: normStatus } : t))
    );

    try {
      const res = await fetch('/api/host/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          table_number: tableNumber,
          status: normStatus,
          business_id: resolvedBiz,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || 'Failed to update table status.');
      await fetchTables();
      onTablesChanged();
      showToast(normStatus === 'VACANT' ? 'Table marked vacant and cleared' : `Table marked ${normStatus.toLowerCase()}`);
    } catch (err: any) {
      await fetchTables();
      console.error('[handleUpdateStatus error]', err);
      showToast(err.message || 'Failed to update status');
    }
  };

  const handleReactivate = async (id: string, tableNumber: string) => {
    try {
      const res = await fetch('/api/host/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, table_number: tableNumber, is_active: true, business_id: resolvedBiz }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || 'Failed to reactivate table');
      await fetchTables();
      onTablesChanged();
      showToast(`Table ${tableNumber} reactivated`);
    } catch (e: any) {
      showToast(e.message || 'Failed to reactivate table');
    }
  };

  return {
    tables,
    isLoading,
    isSaving,
    toast,
    handleAddSingle,
    handleBulkGenerate,
    handleUpdateTable,
    handleRenameZone,
    handleDelete,
    handleUpdateStatus,
    handleReactivate,
  };
}

