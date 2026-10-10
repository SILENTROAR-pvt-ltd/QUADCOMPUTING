'use client';

import React, { useState } from 'react';
import { Plus, Check, Trash2 } from 'lucide-react';

interface RoomCategoryFormActionsProps {
  isEditMode: boolean;
  isSubmitting: boolean;
  isDeleting: boolean;
  onDelete?: () => void;
  onCancel?: () => void;
  submitButtonText?: string;
}

export function RoomCategoryFormActions({
  isEditMode,
  isSubmitting,
  isDeleting,
  onDelete,
  onCancel,
  submitButtonText,
}: RoomCategoryFormActionsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
      {isEditMode && onDelete && (
        <div>
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2 animate-in fade-in">
              <span className="text-xs text-rose-600 font-semibold">Delete accommodation?</span>
              <button
                type="button"
                onClick={onDelete}
                disabled={isDeleting || isSubmitting}
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
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting || isSubmitting}
                className="rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-700 cursor-pointer transition-colors shadow-2xs"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-50 text-rose-600 hover:text-rose-700 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
              <span>Delete Accommodation</span>
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 ml-auto">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto rounded-xl px-5 py-3 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || isDeleting}
          className="w-full sm:w-auto rounded-xl bg-neutral-900 px-7 py-3 text-xs font-semibold text-white shadow-sm hover:bg-black active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              {isEditMode ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              <span>
                {submitButtonText ||
                  (isEditMode
                    ? 'Save Accommodation Changes'
                    : 'Commit Room Category & Provision Physical Rooms')}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
