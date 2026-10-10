'use client';

import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { CatalogItem } from '@/types';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';

interface CatalogItemDeleteButtonProps {
  item: CatalogItem;
  onError: (msg: string) => void;
  onSuccess: () => void;
  onClose: () => void;
}

export function CatalogItemDeleteButton({
  item,
  onError,
  onSuccess,
  onClose,
}: CatalogItemDeleteButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteItem = async () => {
    setIsDeleting(true);
    onError('');

    try {
      const res = await fetch('/api/host/catalog/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          name: item.name,
          metadata: item.metadata || {},
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete item from catalog.');
      }

      useHostWorkspace.getState().removeCatalogItem(item.id);
      useHostWorkspace.getState().archiveCatalogItem(item.id);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Delete item error:', err);
      onError(err.message || 'Failed to delete item from catalog.');
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2 animate-in fade-in">
        <span className="text-xs text-rose-600 font-semibold">Delete permanently?</span>
        <button
          type="button"
          onClick={handleDeleteItem}
          disabled={isDeleting}
          className="rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
        >
          {isDeleting ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          <span>{isDeleting ? 'Deleting...' : 'Yes, Delete'}</span>
        </button>
        <button
          type="button"
          onClick={() => setShowConfirm(false)}
          disabled={isDeleting}
          className="rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-700 cursor-pointer transition-colors shadow-2xs"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShowConfirm(true)}
      className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-50 text-rose-600 hover:text-rose-700 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
    >
      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
      <span>Delete from Catalog</span>
    </button>
  );
}
