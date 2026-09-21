'use client';

import { useState } from 'react';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';

interface ManualIngestModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialItemType?: 'food' | 'room' | 'service';
}

export function ManualIngestModal({ onClose, onSuccess, initialItemType = 'food' }: ManualIngestModalProps) {
  const propertyBranches = useHostWorkspace((state) => state.propertyBranches);
  const profile = useHostWorkspace((state) => state.profile);
  const primaryBranch = propertyBranches[0];
  const upsertCatalogItem = useHostWorkspace((state) => state.upsertCatalogItem);

  const hasAccommodationEnabled = profile?.offersAccommodation ?? false;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    itemType: initialItemType,
    category: initialItemType === 'room' ? 'Suite' : 'Main Course',
    price: '',
    description: '',
    imageUrl: '',
    initialStock: '0',
    capacity: '2',
    bedType: 'King Bed',
    amenities: '',
  });

  const inputClass = "w-full rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-sm text-zinc-900 shadow-sm transition-all focus:border-black focus:outline-none focus:ring-1 focus:ring-black";
  const labelClass = "mb-2 block text-[11px] font-bold uppercase tracking-wider text-zinc-500";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!primaryBranch) {
      setError("No valid location/business found. Please finish onboarding.");
      return;
    }
    
    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        branchId: primaryBranch.id,
        name: formData.name,
        itemType: formData.itemType,
        category: formData.category,
        price: parseFloat(formData.price),
        description: formData.description,
        imageUrl: formData.imageUrl,
        inventoryCount: formData.itemType !== 'room' ? parseInt(formData.initialStock, 10) : undefined,
        capacity: formData.itemType === 'room' ? parseInt(formData.capacity, 10) : undefined,
        bedType: formData.itemType === 'room' ? formData.bedType : undefined,
        amenities: formData.itemType === 'room' ? formData.amenities.split(',').map(a => a.trim()).filter(a => a) : undefined,
      };

      const res = await fetch('/api/host/catalog/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to insert catalog item.');
      }

      const data = await res.json();
      if (data.data) {
        upsertCatalogItem(data.data);
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
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-5">
          <h2 className="font-serif text-xl font-medium text-black">New Catalog Item</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-black">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
          {error && (
            <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}
          
          <form id="manual-ingest-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Item Type</label>
                <div className="flex gap-2 p-1 bg-zinc-50 rounded-xl border border-zinc-100">
                  <button type="button" onClick={() => setFormData({...formData, itemType: 'food'})} className={`flex-1 rounded-lg py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${formData.itemType === 'food' ? 'bg-white shadow text-black' : 'text-zinc-500 hover:text-zinc-700'}`}>Food & Bev</button>
                  {hasAccommodationEnabled && (
                    <button type="button" onClick={() => setFormData({...formData, itemType: 'room'})} className={`flex-1 rounded-lg py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${formData.itemType === 'room' ? 'bg-white shadow text-black' : 'text-zinc-500 hover:text-zinc-700'}`}>Accommodation</button>
                  )}
                  <button type="button" onClick={() => setFormData({...formData, itemType: 'service'})} className={`flex-1 rounded-lg py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${formData.itemType === 'service' ? 'bg-white shadow text-black' : 'text-zinc-500 hover:text-zinc-700'}`}>Service</button>
                </div>
              </div>

              <div>
                <label className={labelClass}>{formData.itemType === 'room' ? 'Room / Stay Name' : 'Item Name'}</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} placeholder={formData.itemType === 'room' ? "e.g. Deluxe Heritage Suite" : "e.g. Truffle Fries"} />
              </div>
              
              <div>
                <label className={labelClass}>{formData.itemType === 'room' ? 'Nightly Tariff (₹)' : 'Price (₹)'}</label>
                <input required type="number" min="0" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className={`${inputClass} font-mono`} placeholder="299.00" />
              </div>
              
              <div className={formData.itemType === 'room' ? '' : 'sm:col-span-2'}>
                <label className={labelClass}>Category</label>
                <input required type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={inputClass} placeholder={formData.itemType === 'room' ? "e.g. Suite" : "e.g. Starters"} />
              </div>

              {formData.itemType === 'room' && (
                <>
                  <div>
                    <label className={labelClass}>Max Guest Capacity</label>
                    <input required type="number" min="1" value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} className={inputClass} placeholder="e.g. 2" />
                  </div>
                  <div>
                    <label className={labelClass}>Bed Type</label>
                    <select value={formData.bedType} onChange={e => setFormData({...formData, bedType: e.target.value})} className={inputClass}>
                      <option value="King Bed">King Bed</option>
                      <option value="Queen Bed">Queen Bed</option>
                      <option value="Twin Beds">Twin Beds</option>
                      <option value="Dormitory Bunk">Dormitory Bunk</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Amenities Tags</label>
                    <input type="text" value={formData.amenities} onChange={e => setFormData({...formData, amenities: e.target.value})} className={inputClass} placeholder="WiFi, Balcony, Mountain View, AC (comma separated)" />
                  </div>
                </>
              )}

              <div className="sm:col-span-2">
                <label className={labelClass}>Description</label>
                <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={inputClass} placeholder={formData.itemType === 'room' ? "Room details and description..." : "A short description..."} />
              </div>
              
              <div className={formData.itemType === 'room' ? 'sm:col-span-2' : ''}>
                <label className={labelClass}>Image Asset URL</label>
                <input type="url" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className={inputClass} placeholder="https://..." />
                {formData.imageUrl && (
                  <div className="mt-3 h-32 w-full overflow-hidden rounded-xl border border-zinc-200">
                    <img src={formData.imageUrl} alt="Preview" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}
              </div>
              
              {formData.itemType !== 'room' && (
                <div>
                  <label className={labelClass}>Initial Stock</label>
                  <input required type="number" min="0" value={formData.initialStock} onChange={e => setFormData({...formData, initialStock: e.target.value})} className={inputClass} />
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-zinc-100 bg-zinc-50 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 hover:bg-zinc-200">
            Cancel
          </button>
          <button type="submit" form="manual-ingest-form" disabled={isSubmitting} className="rounded-xl bg-zinc-950 px-8 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50">
            {isSubmitting ? 'Saving...' : 'Commit to Database'}
          </button>
        </div>
      </div>
    </div>
  );
}
