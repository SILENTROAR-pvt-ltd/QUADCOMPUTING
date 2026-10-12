'use client';

import { useCallback, useEffect, useState } from 'react';
import { clubFetch } from '../api';
import type { MemberProfileData } from './types';

/** Loads a member's travel profile; `reload` after edits. */
export function useMemberProfile(id: string | undefined) {
  const [data, setData] = useState<MemberProfileData | null>(null);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    if (!id) return;
    const res = await clubFetch<MemberProfileData>(`/members/${id}`);
    if (res.ok) { setData(res.data); setError(''); } else setError(res.error);
  }, [id]);
  useEffect(() => { void reload(); }, [reload]);
  return { data, error, reload };
}
