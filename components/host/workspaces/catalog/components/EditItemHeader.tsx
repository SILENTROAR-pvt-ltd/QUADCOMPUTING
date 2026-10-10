'use client';

import React from 'react';
import { X } from 'lucide-react';

interface Props {
  itemName: string;
  onClose: () => void;
}

export function EditItemHeader({ itemName, onClose }: Props) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 bg-neutral-50/60">
      <div>
        <h2 className="font-serif text-lg sm:text-xl font-medium text-neutral-900 tracking-tight">
          Edit Catalog Item
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Editing: <span className="font-semibold text-neutral-800">{itemName}</span>
        </p>
      </div>
      <button
        onClick={onClose}
        aria-label="Close modal"
        className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors cursor-pointer"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
