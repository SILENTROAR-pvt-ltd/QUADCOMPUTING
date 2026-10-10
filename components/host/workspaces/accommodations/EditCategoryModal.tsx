'use client';

import React, { useEffect } from 'react';
import type { RoomCategory, PhysicalRoom } from '@/types';
import { X, Bed, Check, Building2, Sparkles } from 'lucide-react';
import { EditCategoryUnitsTab } from './modals/EditCategoryUnitsTab';
import { EditCategoryDetailsTab } from './modals/EditCategoryDetailsTab';
import { useEditCategoryModal } from './hooks/useEditCategoryModal';
import { DEFAULT_COMMON_AMENITIES } from './configurator/room-category.constants';

interface Props {
  category: RoomCategory | null;
  rooms: PhysicalRoom[];
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

/** Edit a room category's details and add-ons, and add, rename or remove its rooms. */
export function EditCategoryModal({ category, rooms, isOpen, onClose, onUpdated }: Props) {
  const m = useEditCategoryModal({ category, rooms, onUpdated, onClose });

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !category) return null;
  const tab = (on: boolean) =>
    `flex h-9 items-center gap-2 rounded-lg px-3.5 text-xs font-semibold transition-colors cursor-pointer ${on ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/30 p-3 backdrop-blur-sm animate-in fade-in duration-200 sm:p-6">
      <div className="fixed inset-0" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={`Edit ${category.name}`}
        className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white text-neutral-900 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-700"><Building2 className="h-5 w-5" /></div>
            <div>
              <h2 className="font-serif text-2xl tracking-tight text-neutral-950">{category.name}</h2>
              <p className="mt-0.5 text-xs text-neutral-500">Edit the category, its add-ons and its room numbers.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer"><X className="h-5 w-5" /></button>
        </div>

        <div className="shrink-0 border-b border-neutral-200 px-6 py-3">
          <div role="tablist" className="inline-flex gap-1 rounded-xl bg-neutral-100 p-1">
            <button type="button" role="tab" aria-selected={m.activeTab === 'rooms'} onClick={() => m.setActiveTab('rooms')} className={tab(m.activeTab === 'rooms')}>
              <Bed className="h-3.5 w-3.5" /> Rooms ({m.activeTotalUnits})
            </button>
            <button type="button" role="tab" aria-selected={m.activeTab === 'details'} onClick={() => m.setActiveTab('details')} className={tab(m.activeTab === 'details')}>
              <Sparkles className="h-3.5 w-3.5" /> Details &amp; add-ons
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-neutral-50/60 p-6 sm:p-8">
          <form id="editCategoryForm" onSubmit={m.handleSaveAll} className="space-y-6">
            {m.activeTab === 'rooms' && (
              <EditCategoryUnitsTab
                existingUnits={m.existingUnits}
                activeTotalUnits={m.activeTotalUnits}
                onRoomNumberChange={m.handleRoomNumberChange}
                onDeleteExistingRoom={m.handleDeleteExistingRoom}
                newUnits={m.newUnits}
                onRemoveNewRoom={m.handleRemoveNewRoom}
                singleNewRoomInput={m.singleNewRoomInput}
                setSingleNewRoomInput={m.setSingleNewRoomInput}
                onAddNewRoom={m.handleAddNewRoom}
              />
            )}
            {m.activeTab === 'details' && (
              <EditCategoryDetailsTab
                name={m.name} setName={m.setName} price={m.price} setPrice={m.setPrice}
                occupancy={m.occupancy} setOccupancy={m.setOccupancy}
                photoUrl={m.photoUrl} setPhotoUrl={m.setPhotoUrl} photoList={m.photoList}
                onAddPhoto={m.handleAddPhoto} onRemovePhoto={m.handleRemovePhoto}
                selectedAmenities={m.selectedAmenities} toggleAmenity={m.toggleAmenity}
                customAmenityText={m.customAmenityText} setCustomAmenityText={m.setCustomAmenityText}
                onAddCustomAmenity={m.handleAddCustomAmenity}
                addons={m.addons} setAddons={m.setAddons} commonAmenities={DEFAULT_COMMON_AMENITIES}
              />
            )}
          </form>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-neutral-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-neutral-500">Changes update the front desk and the menu catalogue.</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 cursor-pointer">Cancel</button>
            <button type="submit" form="editCategoryForm" disabled={m.isSubmitting}
              className="flex h-10 items-center gap-1.5 rounded-xl bg-neutral-950 px-5 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 cursor-pointer">
              {m.isSubmitting
                ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Saving…</>
                : <><Check className="h-4 w-4" /> Save changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
