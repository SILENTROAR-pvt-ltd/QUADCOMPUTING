'use client';

import React from 'react';

export type DietType = 'veg' | 'non_veg' | 'vegan' | 'egg';

interface FoodDietarySelectorProps {
  foodDietType: DietType;
  setFoodDietType: (val: DietType) => void;
  labelClass: string;
}

const DIET_OPTIONS: { id: DietType; label: string; dot: string }[] = [
  { id: 'veg', label: 'Veg', dot: 'bg-emerald-500' },
  { id: 'non_veg', label: 'Non-Veg', dot: 'bg-rose-500' },
  { id: 'egg', label: 'Egg', dot: 'bg-amber-500' },
  { id: 'vegan', label: 'Vegan', dot: 'bg-teal-500' },
];

export function FoodDietarySelector({
  foodDietType,
  setFoodDietType,
  labelClass,
}: FoodDietarySelectorProps) {
  return (
    <div>
      <label className={labelClass}>Dietary Classification *</label>
      <div className="grid grid-cols-4 gap-1 rounded-xl border border-neutral-200/90 bg-neutral-100/80 p-1">
        {DIET_OPTIONS.map((diet) => {
          const isSelected = foodDietType === diet.id;
          return (
            <button
              key={diet.id}
              type="button"
              onClick={() => setFoodDietType(diet.id)}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                isSelected
                  ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/80'
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-white/50'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${diet.dot}`} />
              <span>{diet.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
