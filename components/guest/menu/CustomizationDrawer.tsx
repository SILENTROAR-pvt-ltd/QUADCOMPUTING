'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CartAddon, CartItem } from '@/lib/store/cart.store';
import {
  CustomizationOption,
  CustomizationGroup,
  CustomizableItem,
  getItemCustomizationGroups,
} from './customization/customization.types';
import { CustomizationDrawerHeader } from './customization/CustomizationDrawerHeader';
import { CustomizationOptionGroup } from './customization/CustomizationOptionGroup';
import { CustomizationDrawerFooter } from './customization/CustomizationDrawerFooter';

export type { CustomizationOption, CustomizationGroup, CustomizableItem };
export { getItemCustomizationGroups };

interface CustomizationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: CustomizableItem | null;
  onAddToCart: (item: Omit<CartItem, 'cart_id'>) => void;
}

export const CustomizationDrawer: React.FC<CustomizationDrawerProps> = ({
  isOpen,
  onClose,
  item,
  onAddToCart,
}) => {
  const [selectedSingles, setSelectedSingles] = useState<Record<string, CustomizationOption>>({});
  const [selectedMultiples, setSelectedMultiples] = useState<Record<string, CustomizationOption[]>>({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (item && isOpen) {
      const groups = getItemCustomizationGroups(item);
      const initialSingles: Record<string, CustomizationOption> = {};
      const initialMultiples: Record<string, CustomizationOption[]> = {};

      groups.forEach((grp) => {
        if (grp.type === 'single') {
          const defaultOpt = grp.options.find((o) => o.is_default) || grp.options[0];
          if (defaultOpt) initialSingles[grp.id] = defaultOpt;
        } else {
          initialMultiples[grp.id] = [];
        }
      });

      setSelectedSingles(initialSingles);
      setSelectedMultiples(initialMultiples);
      setSpecialInstructions('');
      setQuantity(1);
    }
  }, [item, isOpen]);

  const customizationGroups = useMemo(() => {
    if (!item) return [];
    return getItemCustomizationGroups(item);
  }, [item]);

  const isSatisfied = useMemo(() => {
    return customizationGroups.every((grp) => {
      if (grp.required && grp.type === 'single') {
        return !!selectedSingles[grp.id];
      }
      return true;
    });
  }, [customizationGroups, selectedSingles]);

  const selectedAddonsList = useMemo<CartAddon[]>(() => {
    const list: CartAddon[] = [];
    Object.values(selectedSingles).forEach((opt) => {
      if (opt && opt.price > 0) list.push({ name: opt.name, price: opt.price });
    });
    Object.values(selectedMultiples).forEach((opts) => {
      opts.forEach((opt) => {
        list.push({ name: opt.name, price: opt.price });
      });
    });
    return list;
  }, [selectedSingles, selectedMultiples]);

  const addonsTotal = useMemo(() => {
    return selectedAddonsList.reduce((sum, a) => sum + a.price, 0);
  }, [selectedAddonsList]);

  const totalUnitPrice = useMemo(() => {
    if (!item) return 0;
    return Number(item.price) + addonsTotal;
  }, [item, addonsTotal]);

  const grandTotal = totalUnitPrice * quantity;

  const handleSingleSelect = (groupId: string, option: CustomizationOption) => {
    setSelectedSingles((prev) => ({ ...prev, [groupId]: option }));
  };

  const handleMultipleToggle = (groupId: string, option: CustomizationOption) => {
    setSelectedMultiples((prev) => {
      const current = prev[groupId] || [];
      const exists = current.some((o) => o.id === option.id);
      return {
        ...prev,
        [groupId]: exists ? current.filter((o) => o.id !== option.id) : [...current, option],
      };
    });
  };

  const handleConfirmAddToCart = () => {
    if (!item || !isSatisfied) return;

    onAddToCart({
      item_id: item.id,
      name: item.name,
      base_price: Number(item.price),
      quantity,
      selected_addons: selectedAddonsList,
      total_item_price: totalUnitPrice,
      notes: specialInstructions.trim() || undefined,
      image_url: item.image_url,
      category: item.category,
    });

    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && item && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] rounded-t-[32px] bg-neutral-900 text-white border-t border-neutral-800 shadow-2xl flex flex-col overflow-hidden"
          >
            <CustomizationDrawerHeader item={item} onClose={onClose} />

            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-6 custom-scrollbar">
              {customizationGroups.length > 0 ? (
                customizationGroups.map((group) => (
                  <CustomizationOptionGroup
                    key={group.id}
                    group={group}
                    selectedSingles={selectedSingles}
                    selectedMultiples={selectedMultiples}
                    onSingleSelect={handleSingleSelect}
                    onMultipleToggle={handleMultipleToggle}
                  />
                ))
              ) : (
                <div className="text-center py-4 text-xs text-neutral-500 font-light">
                  Standard dish preparation with chef recipe.
                </div>
              )}

              <CustomizationDrawerFooter
                specialInstructions={specialInstructions}
                setSpecialInstructions={setSpecialInstructions}
                quantity={quantity}
                setQuantity={setQuantity}
                selectedAddonsList={selectedAddonsList}
                grandTotal={grandTotal}
                isSatisfied={isSatisfied}
                onConfirmAddToCart={handleConfirmAddToCart}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
