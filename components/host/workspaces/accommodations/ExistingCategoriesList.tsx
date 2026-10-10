'use client';

import React from 'react';
import type { RoomCategory, PhysicalRoom } from '@/types';
import { 
  Building2, 
  Users, 
  ChevronRight, 
  Pencil, 
  Trash2 
} from 'lucide-react';

interface Props {
  categories: RoomCategory[];
  rooms: PhysicalRoom[];
  onSelectCategoryFilter: (categoryId: string) => void;
  onEditCategory: (category: RoomCategory) => void;
  onDeleteCategory: (categoryId: string, name: string) => void;
}

export function ExistingCategoriesList({
  categories,
  rooms,
  onSelectCategoryFilter,
  onEditCategory,
  onDeleteCategory
}: Props) {
  return (
    <div className="space-y-6">
      <h3 className="font-serif text-2xl font-medium tracking-tight text-zinc-900">
        Existing Room Categories ({categories.length})
      </h3>

      {categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-xs text-zinc-400">
          No room categories created yet. Fill out the configurator above to add one.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const physicalUnitsCount = (cat.rooms && Array.isArray(cat.rooms)) 
              ? cat.rooms.length 
              : rooms.filter(r => r.category_id === cat.id).length;

            return (
              <div 
                key={cat.id} 
                className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs space-y-4 flex flex-col justify-between hover:shadow transition-shadow"
              >
                <div>
                  {cat.photos && cat.photos.length > 0 && (
                    <div className="h-36 w-full rounded-2xl overflow-hidden mb-4 bg-zinc-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cat.photos[0]} alt={cat.name} className="h-full w-full object-cover" />
                    </div>
                  )}

                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-serif text-xl font-medium text-black">{cat.name}</h4>
                      <p className="font-serif text-2xl font-normal text-black mt-1">
                        ₹{Number(cat.price).toLocaleString()} <span className="font-sans text-xs text-zinc-400">/ night</span>
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      ✓ Catalog Linked
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {cat.occupancy} Guests Max
                    </span>
                    <span className="flex items-center gap-1.5 font-mono">
                      <Building2 className="h-3.5 w-3.5" />
                      {physicalUnitsCount} Units Active
                    </span>
                  </div>

                  {cat.amenities && cat.amenities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {cat.amenities.slice(0, 4).map((a, i) => (
                        <span key={i} className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600 font-medium">
                          {a}
                        </span>
                      ))}
                      {cat.amenities.length > 4 && (
                        <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-400">
                          +{cat.amenities.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Display Configured Add-Ons */}
                  {((cat.addons && cat.addons.length > 0) || (cat.available_addons && cat.available_addons.length > 0)) && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Add-ons:</span>
                      {(cat.addons || cat.available_addons || []).map((addon) => (
                        <span key={addon.id || addon.name} className="rounded-md bg-zinc-100 border border-zinc-200/60 px-2 py-0.5 text-[10px] text-zinc-800 font-medium">
                          {addon.name} <span className="font-mono text-zinc-950 font-bold">₹{addon.price}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
                  <button
                    onClick={() => onSelectCategoryFilter(cat.id)}
                    className="text-xs font-bold text-zinc-900 hover:underline flex items-center gap-1"
                  >
                    View Units on Grid
                    <ChevronRight className="h-3 w-3" />
                  </button>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditCategory(cat)}
                      className="rounded-lg p-2 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors flex items-center gap-1.5 text-xs font-bold"
                      title="Edit Category & Units"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => onDeleteCategory(cat.id, cat.name)}
                      className="rounded-lg p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
