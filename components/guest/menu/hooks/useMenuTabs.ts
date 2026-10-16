'use client';

import { useEffect } from 'react';
import type { GuestMenuState } from './useGuestMenuState';

type Tab = 'menu' | 'live_order' | 'me';

/**
 * The menu / bill / me tabs. Every switch goes through here, so the open tab survives a refresh and the URL stays shareable.
 * Only the tab is written to the address; account details never go in the URL.
 */
export function useMenuTabs(state: GuestMenuState, tabParam: string | null, sectionParam: string | null) {
  const { setActiveTab, setShowBeyondDining } = state;

  const goTab = (tab: Tab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === 'menu') url.searchParams.delete('tab');
    else url.searchParams.set('tab', tab === 'live_order' ? 'bill' : 'me');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Deep links from the lounge and the tab bar: ?tab=bill | ?tab=me
  useEffect(() => {
    if (tabParam === 'bill') setActiveTab('live_order');
    else if (tabParam === 'me') setActiveTab('me');
  }, [tabParam, setActiveTab]);

  useEffect(() => {
    if (sectionParam !== 'portal' && sectionParam !== 'services') return;
    setActiveTab('menu');
    setShowBeyondDining(true);
    const timer = setTimeout(() => document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' }), 300);
    return () => clearTimeout(timer);
  }, [sectionParam, setActiveTab, setShowBeyondDining]);

  return { goTab, selectTab: (tab: 'menu' | 'bill' | 'me') => goTab(tab === 'bill' ? 'live_order' : tab) };
}
