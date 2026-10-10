'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import type { RecipeIngredient } from './recipe-types';
import { displayQuantity } from './recipe-units';

interface RecipeIngredientListProps {
  ingredients: RecipeIngredient[];
  onRemove: (rawItemId: string) => void;
}

/** The materials one portion of this dish uses, and how much of each. */
export function RecipeIngredientList({ ingredients, onRemove }: RecipeIngredientListProps) {
  if (ingredients.length === 0) {
    return <p className="py-6 text-center text-sm text-zinc-500">No ingredients yet. Each sale of this dish will deduct from the materials you add here.</p>;
  }
  return (
    <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      {ingredients.map((ing) => (
        <li key={ing.raw_item_id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-950">{ing.raw_item?.item_name || 'Removed raw material'}</p>
            <p className="font-mono text-[11px] text-zinc-500">
              {ing.raw_item ? displayQuantity(ing.raw_item.unit, ing.quantity_required) : `${ing.quantity_required}`} per portion
            </p>
          </div>
          <button type="button" onClick={() => onRemove(ing.raw_item_id)} aria-label={`Remove ${ing.raw_item?.item_name ?? 'ingredient'}`}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-700 cursor-pointer">
            <Trash2 className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export default RecipeIngredientList;
