'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function AddPromotionModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [title, setTitle] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !discountValue) return;
    
    setIsSaving(true);
    try {
      const res = await fetch('/api/host/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          code: title,
          type: discountType,
          value: discountValue,
          is_active: isActive
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create promotion');
      }

      onSuccess();
    } catch (e: any) {
      console.error('Failed to create promotion', e);
      alert('Failed to create promotion: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-opacity" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-zinc-100 bg-zinc-50">
          <h2 className="font-semibold text-zinc-900">Add New Promotion</h2>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-black rounded-full hover:bg-zinc-200 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">Promotion Name / Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. DIWALI20"
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm transition-all focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">Type</label>
              <div className="flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
                <button
                  type="button"
                  onClick={() => setDiscountType('percentage')}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold tracking-wider transition-colors ${discountType === 'percentage' ? 'bg-white text-black shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-black'}`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('flat')}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold tracking-wider transition-colors ${discountType === 'flat' ? 'bg-white text-black shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-black'}`}
                >
                  ₹
                </button>
              </div>
            </div>
            
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">Value</label>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="0"
                min="0"
                step={discountType === 'percentage' ? '1' : '0.01'}
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm transition-all focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                required
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div>
              <p className="font-medium text-black text-sm">Active Status</p>
              <p className="text-[11px] text-zinc-500">Enable or disable this promotion immediately.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative h-6 w-11 rounded-full transition-colors ${isActive ? 'bg-emerald-500' : 'bg-zinc-300'}`}
            >
              <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          
          <div className="mt-2 flex justify-end gap-3 pt-4 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 border border-zinc-200 text-zinc-700 rounded-lg text-sm font-semibold hover:bg-zinc-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-zinc-900 text-white rounded-lg text-sm font-semibold hover:bg-zinc-800 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? 'Creating...' : 'Create Promotion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
