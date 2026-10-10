'use client';

import { useState } from 'react';

export function useGuestContactInfo() {
  const currentGuestName =
    (typeof window !== 'undefined' ? localStorage.getItem('quad_guest_name') || localStorage.getItem('guest_name') : null) || 'Guest';

  const [guestNameInput, setGuestNameInput] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('quad_guest_name') || localStorage.getItem('guest_name');
      return stored && stored !== 'Guest' ? stored : '';
    }
    return '';
  });

  const [guestPhoneInput, setGuestPhoneInput] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('quad_guest_phone') || '';
    }
    return '';
  });

  const [guestHandleInput, setGuestHandleInput] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('guest_handle') || localStorage.getItem('quad_guest_wallet_id') || '';
    }
    return '';
  });

  const [guestAvatarInput, setGuestAvatarInput] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('guest_avatar') || '☕';
    }
    return '☕';
  });

  const saveProfile = (
    profileOrName: { name: string; handle: string; phone: string; avatar?: string } | string,
    rawHandle?: string,
    rawPhone?: string,
    rawAvatar: string = '☕'
  ) => {
    if (typeof window === 'undefined') return;
    const name = typeof profileOrName === 'object' ? profileOrName.name : profileOrName;
    const handle = typeof profileOrName === 'object' ? profileOrName.handle : (rawHandle || '');
    const phone = typeof profileOrName === 'object' ? profileOrName.phone : (rawPhone || '');
    const avatar = typeof profileOrName === 'object' ? (profileOrName.avatar || '☕') : rawAvatar;

    const cleanName = name.trim();
    const cleanHandle = handle.trim() ? (handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`) : '';
    const cleanPhone = phone.trim();

    if (cleanName) {
      localStorage.setItem('quad_guest_name', cleanName);
      localStorage.setItem('guest_name', cleanName);
      setGuestNameInput(cleanName);
    }
    if (cleanHandle) {
      localStorage.setItem('guest_handle', cleanHandle);
      localStorage.setItem('quad_guest_wallet_id', cleanHandle);
      setGuestHandleInput(cleanHandle);
    }
    if (cleanPhone) {
      localStorage.setItem('quad_guest_phone', cleanPhone);
      setGuestPhoneInput(cleanPhone);
    }
    if (avatar) {
      localStorage.setItem('guest_avatar', avatar);
      setGuestAvatarInput(avatar);
    }
  };

  return {
    currentGuestName,
    guestNameInput,
    setGuestNameInput,
    guestPhoneInput,
    setGuestPhoneInput,
    guestHandleInput,
    setGuestHandleInput,
    guestAvatarInput,
    setGuestAvatarInput,
    saveProfile,
  };
}
