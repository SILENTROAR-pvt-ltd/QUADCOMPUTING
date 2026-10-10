'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { CatalogItem } from '@/types/catalog';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';
import type { RawItem, RecipeIngredient } from './recipe/recipe-types';
import { toBaseQuantity } from './recipe/recipe-units';
import { RecipeIngredientForm } from './recipe/RecipeIngredientForm';
import { RecipeIngredientList } from './recipe/RecipeIngredientList';

/** Maps the dish to the raw materials one portion uses. Sales deduct these automatically. */
export function RecipeModal({ item, onClose }: { item: CatalogItem; onClose: () => void }) {
  const [rawItems, setRawItems] = useState<RawItem[]>([]);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dishId = String(item.id);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [stock, recipe] = await Promise.all([
        apiRequest<any>('/api/host/inventory/items', { cache: 'no-store' }),
        apiRequest<any>(`/api/host/catalog/recipe?catalogItemId=${encodeURIComponent(dishId)}`, { cache: 'no-store' }),
      ]);
      if (!alive) return;
      if (stock.ok) setRawItems(stock.data?.items ?? []);
      else setError("Couldn't load your raw inventory. Close and try again.");
      if (recipe.ok) setIngredients(recipe.data?.ingredients ?? []);
      else setError("Couldn't load this dish's recipe. Close and try again.");
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [dishId]);

  const taken = useMemo(() => new Set(ingredients.map((i) => i.raw_item_id)), [ingredients]);

  const add = (raw: RawItem, entered: number): string | null => {
    if (taken.has(raw.id)) return `${raw.item_name} is already in this recipe.`;
    const quantity = toBaseQuantity(raw.unit, entered);
    if (!(quantity > 0)) return 'That quantity is too small to record.';
    setIngredients((prev) => [...prev, { raw_item_id: raw.id, quantity_required: quantity, raw_item: raw }]);
    return null;
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const result = await apiRequest('/api/host/catalog/recipe', jsonRequest('POST', {
      catalogItemId: dishId,
      ingredients: ingredients.map((i) => ({ raw_item_id: i.raw_item_id, quantity_required: i.quantity_required })),
    }));
    setSaving(false);
    if (!result.ok) {
      setError(result.error || 'Could not save the recipe. Please try again.');
      return;
    }
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`Recipe for ${item.name}`} className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Recipe</p>
            <h2 className="mt-1 truncate font-serif text-2xl text-zinc-950">{item.name}</h2>
            <p className="mt-1 text-xs text-zinc-500">Raw materials used by one portion. Each sale deducts them from stock.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto bg-zinc-50/60 p-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : rawItems.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-5 py-10 text-center text-sm text-zinc-600">
              You have no raw materials yet. Add them in <span className="font-semibold text-zinc-950">Raw Inventory</span>, then come back to build this recipe.
            </p>
          ) : (
            <>
              <RecipeIngredientForm rawItems={rawItems} taken={taken} onAdd={add} />
              <RecipeIngredientList ingredients={ingredients} onRemove={(id) => setIngredients((prev) => prev.filter((i) => i.raw_item_id !== id))} />
            </>
          )}
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-zinc-100 bg-white px-6 py-4">
          <p className="text-xs text-zinc-500">{ingredients.length} {ingredients.length === 1 ? 'ingredient' : 'ingredients'}</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 cursor-pointer">Cancel</button>
            <button type="button" onClick={save} disabled={saving || loading} className="rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-zinc-800 disabled:opacity-50 cursor-pointer">
              {saving ? 'Saving…' : 'Save recipe'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
