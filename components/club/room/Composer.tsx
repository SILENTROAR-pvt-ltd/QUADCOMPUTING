'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button, Label, Notice, field } from '../ui';
import { Sheet } from '../ui-extra';
import { clubFetch } from '../api';
import { PlacePicker } from '../places/PlacePicker';
import type { PlaceRef } from '../places/types';
import type { Post } from './types';

const MAX = 1000;

/** Post to the Common Room: what you are planning, asking or recommending, the place, and a plan to join. */
export function Composer({ open, onClose, onPosted, initialPlace = null }: {
  open: boolean; onClose: () => void; onPosted: (post: Post) => void; initialPlace?: PlaceRef | null;
}) {
  const [body, setBody] = useState('');
  const [place, setPlace] = useState<PlaceRef | null>(initialPlace);
  const [planId, setPlanId] = useState('');
  const [plans, setPlans] = useState<Array<{ id: string; title: string }>>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);

  useEffect(() => {
    if (open) {
      setPlace(initialPlace);
      void clubFetch('/events').then((r) => r.ok && setPlans(r.data.events.map((e: any) => ({ id: e.id, title: e.title }))));
    }
    // initialPlace is only read when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending.current || !body.trim()) return;
    sending.current = true;
    setBusy(true);
    setError('');
    const res = await clubFetch('/posts', { body: { body, place_id: place?.id ?? null, event_id: planId || null } });
    sending.current = false;
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onPosted(res.data.post);
    setBody(''); setPlace(null); setPlanId('');
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Post to the Common Room">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <textarea data-autofocus aria-label="Your post" className={`${field} min-h-32 resize-y text-[15px]`} maxLength={MAX} value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="Heading to Chiang Mai this Friday. Any recommendations? Who's there right now?" />
          <p className={`mt-1 text-right text-[11px] ${body.length > MAX - 50 ? 'text-amber-700' : 'text-[#14261b]/45'}`}>{body.length}/{MAX}</p>
        </div>
        <PlacePicker value={place} onChange={setPlace} label="Where" />
        {plans.length > 0 && (
          <Label text="Attach a plan" hint="optional">
            <select className={field} value={planId} onChange={(e) => setPlanId(e.target.value)}>
              <option value="">No plan</option>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </Label>
        )}
        <Notice>{error}</Notice>
        <Button type="submit" tone="aura" busy={busy} disabled={!body.trim()} className="w-full">Post</Button>
      </form>
    </Sheet>
  );
}
