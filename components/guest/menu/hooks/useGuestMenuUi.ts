'use client';

import { useState } from 'react';
import type { MenuItem } from '@/components/guest/menu/types';
import type { CustomizableItem } from '@/components/guest/menu/CustomizationDrawer';
import { showGuestToast } from '@/components/guest/menu/toast-store';
import type { DietFilter } from '@/lib/guest/diet-filter';

export function useGuestMenuUi() {
  const [selectedCategory, setSelectedCategory] = useState<string>('Dining');
  const [searchQuery, setSearchQuery] = useState('');
  // The guest's diet filter (Veg, Vegan, Egg, Non-veg); 'all' shows every dish.
  const [dietFilter, setDietFilter] = useState<DietFilter>('all');
  // 'live_order' = the Bill tab; 'me' = profile, wallet & history.
  const [activeTab, setActiveTab] = useState<'menu' | 'live_order' | 'me'>('menu');
  const [customizingItem, setCustomizingItem] = useState<CustomizableItem | null>(null);
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);
  const [showCartReview, setShowCartReview] = useState(false);
  const [orderCookingNotes, setOrderCookingNotes] = useState('');
  const [showBeyondDining, setShowBeyondDining] = useState(false);
  const [selectedService, setSelectedService] = useState<MenuItem | null>(null);
  const [serviceNotificationSent, setServiceNotificationSent] = useState(false);
  const [orderCelebration, setOrderCelebration] = useState(false);
  const [isAddonOrderSuccess, setIsAddonOrderSuccess] = useState(false);

  // The toast has its own store (toast-store.ts): showing it no longer redraws the whole menu.
  const showToast = showGuestToast;

  const handleOpenCustomization = (item: MenuItem) => {
    setCustomizingItem(item);
    setIsCustomizationOpen(true);
  };

  return {
    selectedCategory, setSelectedCategory, searchQuery, setSearchQuery, dietFilter, setDietFilter,
    activeTab, setActiveTab, showToast,
    customizingItem, setCustomizingItem, isCustomizationOpen, setIsCustomizationOpen,
    showCartReview, setShowCartReview, orderCookingNotes, setOrderCookingNotes,
    showBeyondDining, setShowBeyondDining, selectedService, setSelectedService,
    serviceNotificationSent, setServiceNotificationSent,
    orderCelebration, setOrderCelebration, isAddonOrderSuccess, setIsAddonOrderSuccess,
    handleOpenCustomization,
  };
}
