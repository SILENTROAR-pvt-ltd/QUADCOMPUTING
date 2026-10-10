'use client';

import React from 'react';
import { Utensils, Bed, Sparkles } from 'lucide-react';

export type CatalogActiveType = 'food' | 'room' | 'service';

interface Props {
  activeType: CatalogActiveType;
  onChange: (type: CatalogActiveType) => void;
}

export function CatalogTypeSelector({ activeType, onChange }: Props) {
  const tabs = [
    { id: 'food' as const, label: 'FOOD & BEV', icon: Utensils },
    { id: 'room' as const, label: 'ACCOMMODATIONS / ROOM TARIFF', icon: Bed },
    { id: 'service' as const, label: 'SERVICE', icon: Sparkles },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 rounded-2xl bg-neutral-100/80 p-1.5 border border-neutral-200/80">
      {tabs.map(({ id, label, icon: Icon }) => {
        const isActive = activeType === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-semibold tracking-tight transition-all duration-150 cursor-pointer ${isActive
                ? 'bg-white text-neutral-950 shadow-sm border border-neutral-200/70'
                : 'text-neutral-500 hover:text-neutral-900 hover:bg-white/50'
              }`}
          >
            <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? 'text-neutral-950' : 'text-neutral-400'}`} />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
