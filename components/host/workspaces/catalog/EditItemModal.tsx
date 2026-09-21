'use client';

import { useState, useEffect, useRef } from 'react';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import type { CatalogItem } from '@/types';

interface EditItemModalProps {
  item: CatalogItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditItemModal({ item, onClose, onSuccess }: EditItemModalProps) {
  const profile = useHostWorkspace((state) => state.profile);
  const hasAccommodationEnabled = profile?.offersAccommodation ?? false;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    itemType: 'food',
    category: '',
    price: '',
    description: '',
    imageUrl: '',
  });

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        itemType: item.kind === 'food_beverage' ? 'food' : (item.kind === 'accommodation' ? 'room' : 'service'),
        category: 'General',
        price: item.kind === 'food_beverage' ? item.price.amountMinor.toString() : item.nightlyRate.amountMinor.toString(),
        description: item.description || '',
        imageUrl: item.imageUrl || '',
      });
    }
  }, [item]);

  if (!item) return null;

  const inputClass = "w-full rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-sm text-zinc-900 shadow-sm transition-all focus:border-black focus:outline-none focus:ring-1 focus:ring-black";
  const labelClass = "mb-2 block text-[11px] font-bold uppercase tracking-wider text-zinc-500";

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      const base64 = await convertToBase64(droppedFile);
      setFormData({ ...formData, imageUrl: base64 });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const base64 = await convertToBase64(e.target.files[0]);
      setFormData({ ...formData, imageUrl: base64 });
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        id: item!.id,
        name: formData.name,
        item_type: formData.itemType,
        category: formData.category || 'General',
        price: parseFloat(formData.price),
        description: formData.description,
        image_url: formData.imageUrl,
      };

      const res = await fetch('/api/host/catalog/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update catalog item.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-zinc-100 px-8 py-6">
          <div>
            <h2 className="font-serif text-2xl font-medium text-black">Edit Catalog Item</h2>
            <p className="mt-1 font-mono text-[10px] text-zinc-400 tracking-wider">ID: {item.id}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-black self-start">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-8 py-6">
          {error && (
            <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}
          
          <form id="edit-ingest-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Item Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Price (₹)</label>
                <input required type="number" min="0" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Item Type</label>
                <select value={formData.itemType} onChange={e => setFormData({...formData, itemType: e.target.value})} className={inputClass}>
                  <option value="food">Food & Beverage</option>
                  {hasAccommodationEnabled && <option value="room">Accommodation</option>}
                  <option value="service">Service</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <input required type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={inputClass} placeholder="e.g. Starters, Suite" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Description</label>
                <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Image Asset</label>
                <div 
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleFileDrop}
                  className="mt-1 flex flex-col gap-3 rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-4 transition-colors hover:bg-zinc-50"
                >
                  <input type="text" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className={inputClass} placeholder="Paste Image URL here..." />
                  
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-zinc-200"></div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">OR</span>
                    <div className="h-px flex-1 bg-zinc-200"></div>
                  </div>

                  <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-600 shadow-sm transition-colors hover:bg-zinc-100 hover:text-black">
                    Drag & Drop or Click to Upload Image
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                </div>

                {formData.imageUrl && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 relative group">
                    <img src={formData.imageUrl} alt="Preview" className="h-48 w-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    <button type="button" onClick={() => setFormData({...formData, imageUrl: ''})} className="absolute top-2 right-2 rounded-full bg-white/90 p-1.5 opacity-0 transition-opacity group-hover:opacity-100 shadow-sm hover:bg-red-50 hover:text-red-600">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-zinc-100 bg-zinc-50 px-8 py-5">
          <button type="button" onClick={onClose} className="rounded-xl px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 hover:bg-zinc-200">
            Cancel
          </button>
          <button type="submit" form="edit-ingest-form" disabled={isSubmitting} className="rounded-xl bg-zinc-950 px-8 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm hover:bg-black disabled:opacity-50">
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
