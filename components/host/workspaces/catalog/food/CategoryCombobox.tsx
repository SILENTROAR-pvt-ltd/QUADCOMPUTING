'use client';

import React, { useMemo } from 'react';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import { isFoodBeverageEntity } from '@/lib/utils/catalog-item';
import { sortCulinaryCategories } from '@/lib/utils/menu-categories';

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  inputClass: string;
  labelClass: string;
}

/** The venue's own food categories, from its catalog. Nothing is made up. */
export function CategoryCombobox({ value, onChange, inputClass, labelClass }: CategoryComboboxProps) {
  const catalog = useHostWorkspace((state) => state.serviceCatalog);
  const suggestions = useMemo(() => {
    const names = new Set<string>();
    for (const item of catalog) {
      if (!isFoodBeverageEntity(item)) continue;
      const name = String((item as any).category || '').trim();
      if (name) names.add(name);
    }
    return sortCulinaryCategories(names);
  }, [catalog]);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className={labelClass}>Menu Category *</label>
        <span className="text-[10px] font-normal text-neutral-400">Your categories, or a new one</span>
      </div>
      <input
        required
        type="text"
        list="menu-category-suggestions"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        placeholder="e.g. Quick Bites, Sandwiches"
        autoComplete="off"
      />
      <datalist id="menu-category-suggestions">
        {suggestions.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {suggestions.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.map((cat) => {
            const isSelected = value.trim().toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onChange(cat)}
                className={`cursor-pointer rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  isSelected ? 'bg-neutral-900 text-white shadow-2xs' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-neutral-500">No categories yet. Type the first one, for example Quick Bites.</p>
      )}
    </div>
  );
}
