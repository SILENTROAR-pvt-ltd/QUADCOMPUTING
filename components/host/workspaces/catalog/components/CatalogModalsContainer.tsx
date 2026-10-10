'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { ManualIngestModal } from '../ManualIngestModal';
import { AiIngestModal } from '../AiIngestModal';
import { EditItemModal } from '../EditItemModal';
import { RoomCategoryModal } from '../../accommodations/RoomCategoryModal';
import { RecipeModal } from '../RecipeModal';

const PhotoVaultManagerModal = dynamic(
  () => import('../PhotoVaultManagerModal').then((m) => m.PhotoVaultManagerModal),
  { ssr: false }
);

interface Props {
  modals: any;
  onRefresh: () => void;
  activeCafeId?: string;
}

export function CatalogModalsContainer({ modals, onRefresh, activeCafeId }: Props) {
  return (
    <>
      {modals.isManualModalOpen && (
        <ManualIngestModal
          onClose={() => modals.setIsManualModalOpen(false)}
          onSuccess={onRefresh}
          initialItemType={modals.initialItemType}
        />
      )}
      {modals.isAiModalOpen && (
        <AiIngestModal
          onClose={() => modals.setIsAiModalOpen(false)}
          onSuccess={onRefresh}
        />
      )}
      {modals.selectedItem && (
        <EditItemModal
          item={modals.selectedItem}
          onClose={() => modals.setSelectedItem(null)}
          onSuccess={onRefresh}
        />
      )}
      {modals.editingAccommodation && (
        <RoomCategoryModal
          initialData={modals.editingAccommodation}
          isOpen={Boolean(modals.editingAccommodation)}
          onClose={() => modals.setEditingAccommodation(null)}
          onUpdated={onRefresh}
        />
      )}
      {modals.recipeItem && (
        <RecipeModal
          item={modals.recipeItem}
          onClose={() => modals.setRecipeItem(null)}
        />
      )}
      {modals.isPhotoVaultOpen && (
        <PhotoVaultManagerModal
          isOpen={modals.isPhotoVaultOpen}
          onClose={() => modals.setIsPhotoVaultOpen(false)}
          venueId={activeCafeId}
          onUpdated={onRefresh}
        />
      )}
    </>
  );
}
