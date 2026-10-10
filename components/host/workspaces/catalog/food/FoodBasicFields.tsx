'use client';

import React from 'react';

interface FoodBasicFieldsProps {
  foodName: string;
  setFoodName: (val: string) => void;
  foodPrice: string;
  setFoodPrice: (val: string) => void;
  inputClass: string;
  labelClass: string;
}

export function FoodBasicFields({
  foodName,
  setFoodName,
  foodPrice,
  setFoodPrice,
  inputClass,
  labelClass,
}: FoodBasicFieldsProps) {
  return (
    <>
      <div>
        <label className={labelClass}>Dish Name *</label>
        <input
          required
          type="text"
          value={foodName}
          onChange={(e) => setFoodName(e.target.value)}
          className={inputClass}
          placeholder="e.g. Truffle Mushroom Risotto"
        />
      </div>

      <div>
        <label className={labelClass}>Price (₹) *</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-400 select-none">
            ₹
          </span>
          <input
            required
            type="number"
            min="0"
            step="any"
            value={foodPrice}
            onChange={(e) => setFoodPrice(e.target.value)}
            className={`${inputClass} pl-8 font-mono font-medium`}
            placeholder="450.00"
          />
        </div>
      </div>
    </>
  );
}
