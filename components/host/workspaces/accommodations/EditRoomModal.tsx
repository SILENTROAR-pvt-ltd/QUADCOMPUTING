'use client';

import React, { useState, useEffect } from 'react';
import type { PhysicalRoom, RoomCategory, RoomStatus } from '@/types';
import { X, Bed, Check, Trash2, ShieldCheck, Tag, Pencil } from 'lucide-react';
import { RoomCategoryModal } from './RoomCategoryModal';

interface Props {
  room: PhysicalRoom | null;
  categories: RoomCategory[];
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const inputClass = "w-full bg-neutral-50/80 border border-neutral-200 focus:border-neutral-900 text-neutral-900 rounded-xl px-4 py-3 text-sm outline-none transition-all focus:bg-white";
const labelClass = "mb-2 block text-[11px] font-bold uppercase tracking-wider text-neutral-500";

export function EditRoomModal({ room, categories, isOpen, onClose, onUpdated }: Props) {
  const [roomNumber, setRoomNumber] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<RoomStatus>('VACANT');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);

  useEffect(() => {
    if (room) {
      setRoomNumber(room.room_number || '');
      setCategoryId(room.category_id || (categories[0]?.id || ''));
      setStatus(room.status || 'VACANT');
    }
  }, [room, categories]);

  const assignedCategory = room ? (categories.find(c => c.id === (room.category_id || room.category?.id)) || room.category) : null;

  if (!isOpen || !room) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber.trim()) {
      alert('Room number cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/host/accommodations/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: room.id,
          room_number: roomNumber.trim(),
          status: status
        })
      });

      if (res.ok) {
        onUpdated();
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update room');
      }
    } catch (err) {
      console.error('Update room error', err);
      alert('Network error updating room');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (room.status === 'OCCUPIED') {
      alert('Cannot delete an occupied room. Check out guest first.');
      return;
    }
    if (!confirm(`Are you sure you want to delete Room ${room.room_number}?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/host/accommodations/rooms?id=${room.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        onUpdated();
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete room');
      }
    } catch (err) {
      console.error('Delete room error', err);
      alert('Network error deleting room');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-zinc-200 space-y-6 animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-medium text-neutral-900 tracking-tight">
              Edit Room {room.room_number}
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Assigned Category: <span className="font-semibold text-neutral-800">{room.category?.name || 'Standard Unit'}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-full p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSave} className="space-y-4">

          <div>
            <label className={labelClass}>Room / Unit Number *</label>
            <input
              type="text"
              required
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="e.g. 101, Villa-A, Suite 2"
              className={`${inputClass} font-mono font-bold text-sm`}
              autoFocus
            />
            <p className="mt-1 text-[11px] text-zinc-400">
              Unique room number displayed across Front Desk, POS billing, and KOTs.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Assigned Category</label>
              {assignedCategory && (
                <button
                  type="button"
                  onClick={() => setIsEditingCategory(true)}
                  className="text-[11px] font-bold text-black hover:underline flex items-center gap-1"
                >
                  <Pencil className="h-3 w-3" />
                  Edit Category Specs
                </button>
              )}
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs flex items-center justify-between">
              <div>
                <p className="font-bold text-zinc-900">{assignedCategory?.name || 'Standard Unit'}</p>
                <p className="text-zinc-500 font-mono">₹{Number(assignedCategory?.price || 0).toLocaleString()} / night</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-white border border-zinc-200 px-2 py-0.5 text-[10px] font-bold text-zinc-600">
                  {assignedCategory?.occupancy || 2} Guests Max
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingCategory(true)}
                  className="rounded-lg bg-zinc-900 text-white hover:bg-black px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors shadow-2xs"
                >
                  Edit Specs
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>Room Status</label>
            {room.status === 'OCCUPIED' ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                <p className="font-bold">Room is Currently Occupied</p>
                <p className="text-rose-700 mt-0.5">Guest: {room.guest_name || 'In-House'}. Status changes to CLEANING upon checkout.</p>
              </div>
            ) : (
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RoomStatus)}
                className={inputClass}
              >
                <option value="VACANT">VACANT (Ready for check-in)</option>
                <option value="CLEANING">CLEANING (Housekeeping in progress)</option>
                <option value="MAINTENANCE">MAINTENANCE (Out of order)</option>
              </select>
            )}
          </div>

          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || room.status === 'OCCUPIED'}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 disabled:opacity-30 disabled:hover:text-rose-600 flex items-center gap-1.5 p-2 rounded-xl hover:bg-rose-50 transition-colors"
              title={room.status === 'OCCUPIED' ? 'Cannot delete occupied room' : 'Delete this room'}
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Unit</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-zinc-950 px-5 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Update Room
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>

      {isEditingCategory && assignedCategory && (
        <RoomCategoryModal
          initialData={{
            id: assignedCategory.id,
            name: assignedCategory.name,
            price: assignedCategory.price,
            occupancy: assignedCategory.occupancy,
            photos: assignedCategory.photos || [],
            amenities: assignedCategory.amenities || [],
            addons: assignedCategory.addons || assignedCategory.available_addons || [],
          }}
          isOpen={isEditingCategory}
          onClose={() => setIsEditingCategory(false)}
          onUpdated={() => {
            setIsEditingCategory(false);
            onUpdated();
          }}
        />
      )}
    </div>
  );
}
