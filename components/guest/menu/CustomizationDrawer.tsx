'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CartItem } from '@/lib/store/cart.store';
import {
  CustomizationOption,
  CustomizationGroup,
  CustomizableItem,
  getItemCustomizationGroups,
} from './customization/customization.types';
import { CustomizationDrawerHeader } from './customization/CustomizationDrawerHeader';
import { CustomizationOptionGroup } from './customization/CustomizationOptionGroup';
import { CustomizationDrawerFooter } from './customization/CustomizationDrawerFooter';
import { useCustomizationSelection } from './customization/useCustomizationSelection';

export type { CustomizationOption, CustomizationGroup, CustomizableItem };
export { getItemCustomizationGroups };

interface CustomizationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: CustomizableItem | null;
  onAddToCart: (item: Omit<CartItem, 'cart_id'>) => void;
}

/** The sheet for a dish with options: its choices, a note and a quantity. The cart is updated on the same tap as "Add". */
export const CustomizationDrawer: React.FC<CustomizationDrawerProps> = ({ isOpen, onClose, item, onAddToCart }) => {
  const sel = useCustomizationSelection(item, isOpen);

  const confirm = () => {
    if (!item || !sel.satisfied) return;
    onAddToCart({
      item_id: item.id,
      name: item.name,
      base_price: Number(item.price),
      quantity: sel.quantity,
      selected_addons: sel.addons,
      total_item_price: sel.unitPrice,
      notes: sel.instructions.trim() || undefined,
      image_url: item.image_url,
      category: item.category,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && item && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
          <motion.div
            role="dialog" aria-modal="true" aria-label={`Customise ${item.name}`}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-[32px] border-t border-neutral-800 bg-neutral-900 text-white shadow-2xl"
          >
            <CustomizationDrawerHeader item={item} onClose={onClose} />
            <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
              {sel.groups.length > 0 ? (
                sel.groups.map((group) => (
                  <CustomizationOptionGroup key={group.id} group={group} selectedSingles={sel.singles} selectedMultiples={sel.multiples}
                    onSingleSelect={sel.pickSingle} onMultipleToggle={sel.toggleMultiple} />
                ))
              ) : (
                <div className="py-4 text-center text-xs font-light text-neutral-500">Standard dish preparation with chef recipe.</div>
              )}
              <CustomizationDrawerFooter
                specialInstructions={sel.instructions} setSpecialInstructions={sel.setInstructions}
                quantity={sel.quantity} setQuantity={sel.setQuantity} selectedAddonsList={sel.addons}
                grandTotal={sel.total} isSatisfied={sel.satisfied} onConfirmAddToCart={confirm}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
