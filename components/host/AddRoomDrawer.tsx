'use client';

import { useState, type FormEvent } from 'react';
import { useDrawer } from '@/lib/store/drawer.store';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';

export default function AddRoomDrawer({ branchId }: { branchId: string }) {
  const close = useDrawer((state) => state.close);
  const upsertCatalogItem = useHostWorkspace((state) => state.upsertCatalogItem);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('suite');
  const [tariff, setTariff] = useState('');
  const [maxGuests, setMaxGuests] = useState('2');
  const [imageUrl, setImageUrl] = useState('');
  const [addons, setAddons] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !tariff || Number(tariff) < 0) return;
    
    setIsSaving(true);
    setError('');

    try {
      const res = await fetch('/api/host/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId,
          itemType: 'room',
          name: title.trim(),
          description: `Max Guests: ${maxGuests}`,
          price: Number(tariff),
          category,
          imageUrl: imageUrl.trim() || null,
          inventoryCount: 1, // Defaulting 1 room unit per listing mapping
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to persist accommodation');
      }

      const { data } = await res.json();
      upsertCatalogItem(data);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Database sync failed. Try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Drawer title="Add Accommodation / Tariff" onClose={close}>
      <form className="space-y-5" onSubmit={submit}>
        <Field label="Accommodation Name">
          <input className={inputClass} disabled={isSaving} required value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Room Type">
            <select className={inputClass} disabled={isSaving} value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="standard">Standard</option>
              <option value="deluxe">Deluxe</option>
              <option value="suite">Suite</option>
              <option value="villa">Villa</option>
              <option value="dorm_bed">Dorm Bed</option>
            </select>
          </Field>
          <Field label="Nightly Rate (INR)">
            <input className={inputClass} disabled={isSaving} min="0" required type="number" value={tariff} onChange={(event) => setTariff(event.target.value)} />
          </Field>
        </div>
        <Field label="Maximum Guests">
          <input className={inputClass} disabled={isSaving} min="1" type="number" value={maxGuests} onChange={(event) => setMaxGuests(event.target.value)} />
        </Field>
        <Field label="Image URL">
          <input className={inputClass} disabled={isSaving} type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
        </Field>
        <Field label="Inclusions / Add-ons">
          <input className={inputClass} disabled={isSaving} value={addons} onChange={(event) => setAddons(event.target.value)} />
        </Field>
        
        {error && <p className="text-[11px] text-red-400">{error}</p>}
        
        <button className={submitClass} disabled={isSaving} type="submit">
          {isSaving ? 'Synchronizing with Database...' : 'Commit Accommodation'}
        </button>
      </form>
    </Drawer>
  );
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 flex justify-end bg-black/80" onClick={onClose}><aside className="h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-zinc-950 p-6 text-white md:p-8" onClick={(event) => event.stopPropagation()}><div className="mb-8 flex justify-between border-b border-white/10 pb-4"><h2 className="font-serif text-2xl font-light">{title}</h2><button className="text-zinc-400 hover:text-white" onClick={onClose} type="button">Close</button></div>{children}</aside></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-[10px] uppercase tracking-widest text-zinc-500">{label}</span>{children}</label>; }
const inputClass = 'w-full rounded-xl border border-white/20 bg-zinc-950 p-3 text-sm text-white placeholder:text-zinc-600 focus:border-white focus:outline-none focus:ring-1 focus:ring-white/30 disabled:opacity-50';
const submitClass = 'w-full rounded-xl bg-white py-3.5 text-xs uppercase tracking-widest text-black hover:bg-zinc-300 disabled:bg-zinc-600 disabled:cursor-not-allowed';
