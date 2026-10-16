'use client';

import { useEffect, useRef, useState } from 'react';
import { checkHandle, type HandleStatus } from '@/lib/guest/guest-account-client';
import { createClient } from '@/lib/supabase/client';
import { suggestHandle } from '@/lib/auth/safe-next';

export const cleanHandle = (v: string) => v.replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);

/**
 * The name and @handle of the profile being made. They are suggested from the signed-in account (Google name, or the start
 * of the email) and never overwrite what the person types. The handle's availability is checked a moment after typing stops;
 * a suggested handle that is taken is retried with digits, a few times.
 */
export function useHandleSuggestion() {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [status, setStatus] = useState<HandleStatus>('unknown');
  const touched = useRef({ name: false, handle: false });
  const tries = useRef(0);
  const base = useRef('');

  useEffect(() => {
    let live = true;
    void createClient().auth.getUser().then(({ data }) => {
      const user = data?.user;
      if (!live || !user) return;
      const meta: any = user.user_metadata || {};
      const fullName = String(meta.full_name || meta.name || '').trim();
      if (fullName && !touched.current.name) setName(fullName);
      const suggestion = suggestHandle(fullName, user.email);
      if (suggestion && !touched.current.handle) { base.current = suggestion; setHandle(suggestion); }
    }).catch(() => {});
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const value = cleanHandle(handle);
    if (value.length < 2) { setStatus(value.length === 0 ? 'unknown' : 'invalid'); return; }
    let live = true;
    const timer = setTimeout(() => {
      void checkHandle(value).then((next) => {
        if (!live) return;
        if ((next === 'taken' || next === 'legacy') && !touched.current.handle && tries.current < 4) {
          tries.current += 1;
          setHandle(`${(base.current || value).slice(0, 26)}${Math.floor(10 + Math.random() * 990)}`);
          return;
        }
        setStatus(next);
      });
    }, 400);
    return () => { live = false; clearTimeout(timer); };
  }, [handle]);

  return {
    name, handle, status, setStatus,
    typeName: (v: string) => { touched.current.name = true; setName(v); },
    typeHandle: (v: string) => { touched.current.handle = true; setHandle(cleanHandle(v)); },
  };
}
