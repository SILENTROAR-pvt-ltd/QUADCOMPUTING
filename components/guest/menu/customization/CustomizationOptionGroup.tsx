'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { CustomizationGroup, CustomizationOption } from './customization.types';

interface CustomizationOptionGroupProps {
  group: CustomizationGroup;
  selectedSingles: Record<string, CustomizationOption>;
  selectedMultiples: Record<string, CustomizationOption[]>;
  onSingleSelect: (groupId: string, option: CustomizationOption) => void;
  onMultipleToggle: (groupId: string, option: CustomizationOption) => void;
}

export function CustomizationOptionGroup({
  group,
  selectedSingles,
  selectedMultiples,
  onSingleSelect,
  onMultipleToggle,
}: CustomizationOptionGroupProps) {
  const isSingle = group.type === 'single';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
            {group.name}
          </h4>
          {group.required ? (
            <span className="rounded-full bg-neutral-800 border border-neutral-700 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-300">
              Mandatory
            </span>
          ) : (
            <span className="text-[11px] text-neutral-500 font-normal">Optional</span>
          )}
        </div>
        {isSingle && (
          <span className="text-[11px] text-neutral-400 font-medium">Select 1</span>
        )}
      </div>

      <div className="divide-y divide-neutral-800/80 rounded-2xl border border-neutral-800 bg-neutral-950/60 overflow-hidden">
        {group.options.map((opt) => {
          const isSelected = isSingle
            ? selectedSingles[group.id]?.id === opt.id
            : (selectedMultiples[group.id] || []).some((o) => o.id === opt.id);

          return (
            <div
              key={opt.id}
              onClick={() =>
                isSingle
                  ? onSingleSelect(group.id, opt)
                  : onMultipleToggle(group.id, opt)
              }
              className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-neutral-900/60 cursor-pointer transition-colors active:bg-neutral-900"
            >
              <div className="flex items-center gap-3">
                {isSingle ? (
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-white bg-white'
                        : 'border-neutral-700 bg-neutral-950'
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-neutral-950" />}
                  </div>
                ) : (
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-white bg-white text-neutral-950'
                        : 'border-neutral-700 bg-neutral-950 text-transparent'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                )}

                <span
                  className={`text-sm sm:text-base font-medium transition-colors ${
                    isSelected ? 'text-white font-semibold' : 'text-neutral-300'
                  }`}
                >
                  {opt.name}
                </span>
              </div>

              <span className="text-sm font-mono font-medium text-neutral-300">
                {opt.price === 0 ? 'Free' : `+₹${opt.price}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
