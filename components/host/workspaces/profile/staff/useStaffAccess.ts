'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';
import type { StaffRole } from '@/lib/services/staff-auth/staff-roles';

export interface StaffMember { id: string; name: string; role: StaffRole | null; active: boolean; hasPin: boolean; lastLoginAt: string | null }

interface ListResponse { businessId: string | null; staff: StaffMember[] }

/** The venue's staff and their PIN access: load, add, and change (role, new PIN, switch on or off). */
export function useStaffAccess() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await apiRequest<ListResponse>('/api/host/staff/access', { cache: 'no-store' });
    if (r.ok && r.data) { setStaff(r.data.staff); setBusinessId(r.data.businessId); setError(null); } else setError(r.error);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const send = async (method: 'POST' | 'PUT' | 'DELETE', body: Record<string, unknown>): Promise<string | null> => {
    const r = method === 'DELETE'
      ? await apiRequest('/api/host/staff/access?id=' + encodeURIComponent(String(body.id)), { method: 'DELETE' })
      : await apiRequest('/api/host/staff/access', jsonRequest(method, body));
    if (!r.ok) return r.error || 'That could not be saved.';
    await load();
    return null;
  };

  return {
    staff, businessId, loading, error,
    add: (name: string, role: StaffRole, pin: string) => send('POST', { name, role, pin }),
    change: (id: string, patch: { name?: string; role?: StaffRole; pin?: string; active?: boolean }) => send('PUT', { id, ...patch }),
    remove: (id: string) => send('DELETE', { id }),
  };
}
