'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { RoomCategoryForm, RoomCategoryFormData } from './configurator/RoomCategoryForm';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';

interface Props {
  initialData: Partial<RoomCategoryFormData> | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  categoryTitle?: string;
}

export function RoomCategoryModal({
  initialData,
  isOpen,
  onClose,
  onUpdated,
  categoryTitle
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !initialData) return null;

  const handleDelete = async () => {
    if (!initialData.id) return;
    setIsDeleting(true);
    try {
      // Delete the category first, then its catalog entry; stop and report at the first failure so
      // the UI never shows an accommodation as gone while the server still has it.
      const catResult = await apiRequest(`/api/host/accommodations/categories?id=${encodeURIComponent(initialData.id)}`, { method: 'DELETE' });
      if (!catResult.ok) {
        alert(catResult.error || 'Failed to delete accommodation. Please try again.');
        return;
      }

      const catalogResult = await apiRequest('/api/host/catalog/delete', jsonRequest('POST', {
        id: initialData.id,
        catalog_item_id: (initialData as any).catalog_item_id,
      }));
      if (!catalogResult.ok) {
        alert(catalogResult.error || 'The category was removed but its catalog entry could not be. Please refresh and retry.');
        onUpdated();
        return;
      }

      if (initialData.id) {
        useHostWorkspace.getState().removeCatalogItem(initialData.id as any);
        useHostWorkspace.getState().archiveCatalogItem(initialData.id as any);
      }
      if ((initialData as any).catalog_item_id) {
        useHostWorkspace.getState().removeCatalogItem((initialData as any).catalog_item_id);
        useHostWorkspace.getState().archiveCatalogItem((initialData as any).catalog_item_id);
      }

      onUpdated();
      onClose();
    } catch (err: any) {
      console.error('Delete category error:', err);
      alert('Failed to delete accommodation. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };
  const handleSubmit = async (formData: RoomCategoryFormData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/host/accommodations/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formData.id,
          name: formData.name,
          price: formData.price,
          occupancy: formData.occupancy,
          photos: formData.photos,
          amenities: formData.amenities,
          addons: formData.addons,
          available_addons: formData.addons,
          add_ons: formData.addons,
          new_room_numbers: formData.room_numbers
        })
      });

      if (res.ok) {
        onUpdated();
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update accommodation category');
      }
    } catch (err) {
      console.error('Update category error:', err);
      alert('Network error while saving accommodation changes');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-neutral-200 animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 bg-neutral-50/60">
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-medium text-neutral-900 tracking-tight">
              {categoryTitle || 'Edit Accommodation'}
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Editing: <span className="font-semibold text-neutral-800">{initialData.name || 'Category'}</span>
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

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <RoomCategoryForm
            initialData={initialData}
            isSubmitting={isSubmitting}
            isDeleting={isDeleting}
            onSubmit={handleSubmit}
            onCancel={onClose}
            onDelete={handleDelete}
            isEditMode={true}
            showRoomNumbers={false}
            submitButtonText="Save All Accommodation Specs & Add-ons"
          />
        </div>
      </div>
    </div>
  );
}
