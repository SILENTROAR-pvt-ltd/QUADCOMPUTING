'use client';

import React from 'react';
import { Clock } from 'lucide-react';

interface FoodPrepStockFieldsProps {
  foodPrepTime: string;
  setFoodPrepTime: (val: string) => void;
  foodInitialStock: string;
  setFoodInitialStock: (val: string) => void;
  foodDescription: string;
  setFoodDescription: (val: string) => void;
  inputClass: string;
  labelClass: string;
}

export function FoodPrepStockFields({
  foodPrepTime,
  setFoodPrepTime,
  foodInitialStock,
  setFoodInitialStock,
  foodDescription,
  setFoodDescription,
  inputClass,
  labelClass,
}: FoodPrepStockFieldsProps) {
  return (
    <>
      <div>
        <label className={labelClass}>Kitchen Prep Time (Minutes)</label>
        <div className="relative">
          <input
            type="number"
            min="1"
            value={foodPrepTime}
            onChange={(e) => setFoodPrepTime(e.target.value)}
            className={`${inputClass} pr-10`}
            placeholder="15"
          />
          <Clock className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
        </div>
      </div>

      <div>
        <label className={labelClass}>Initial Inventory Stock Count</label>
        <input
          type="number"
          min="0"
          value={foodInitialStock}
          onChange={(e) => setFoodInitialStock(e.target.value)}
          className={inputClass}
          placeholder="50"
        />
      </div>

      <div className="sm:col-span-2">
        <label className={labelClass}>Description & Ingredients</label>
        <textarea
          rows={2}
          value={foodDescription}
          onChange={(e) => setFoodDescription(e.target.value)}
          className={`${inputClass} resize-none`}
          placeholder="Key ingredients, flavor profile, chef notes..."
        />
      </div>
    </>
  );
}
