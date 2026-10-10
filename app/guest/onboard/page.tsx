'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useGuestLobbyStore } from '@/lib/store/guest-lobby.store';
import { GuestOnboardForm } from '@/components/guest/onboard/GuestOnboardForm';
import { GUEST_BRAND } from '@/lib/brand';

function GuestOnboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);

  const cafeIdParam =
    searchParams.get('cafe_id') ||
    searchParams.get('cafe') ||
    searchParams.get('property_id') ||
    '';
  const tableQueryParam = searchParams.get('table') || searchParams.get('table_number') || '';

  const { setSession } = useGuestLobbyStore();

  const [guestName, setGuestName] = useState('');
  const [tableNumber, setTableNumber] = useState(tableQueryParam);
  const [businessName, setBusinessName] = useState('');
  const [availableTables] = useState<string[]>([
    'T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'T-06',
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const vid = videoRef.current;
    if (vid) {
      vid.muted = true;
      vid.defaultMuted = true;
      const playPromise = vid.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Video autoplay policy handling:', err);
        });
      }
    }
  }, []);

  useEffect(() => {
    fetch(`/api/guest/menu?cafe_id=${encodeURIComponent(cafeIdParam)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.business?.name) {
          setBusinessName(data.business.name);
        }
      })
      .catch(() => {});
  }, [cafeIdParam]);

  const isFormValid = guestName.trim().length > 0 && tableNumber.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setErrorMessage('Please enter both your name and table number to proceed.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    const cleanTable = tableNumber.trim().toUpperCase().startsWith('T-')
      ? tableNumber.trim().toUpperCase()
      : `T-${tableNumber.trim().replace(/^Table\s*/i, '').padStart(2, '0')}`;

    try {
      const res = await fetch('/api/guest/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name: guestName.trim(),
          table_number: cleanTable,
          cafe_id: cafeIdParam,
        }),
      });

      const data = await res.json();
      if (!res.ok && !data?.customer_id) {
        throw new Error(data?.error || 'Failed to initialize guest session');
      }

      const assignedCustomerId = data.customer_id;

      setSession({
        customer_id: assignedCustomerId,
        session_id: assignedCustomerId,
        table_number: cleanTable,
        cafe_id: cafeIdParam,
        guest_name: guestName.trim(),
        avatar: '☕',
        business_name: businessName,
        status: 'active',
        created_at: data.session?.created_at || new Date().toISOString(),
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('quad_customer_id', assignedCustomerId);
        localStorage.setItem('quad_guest_uuid', assignedCustomerId);
        localStorage.setItem('quad_table_number', cleanTable);
        localStorage.setItem('quad_cafe_id', cafeIdParam);
        localStorage.setItem('quad_guest_name', guestName.trim());
      }

      const targetUrl =
        cafeIdParam
          ? `/menu?table=${encodeURIComponent(cleanTable)}&cafe_id=${encodeURIComponent(cafeIdParam)}`
          : `/menu?table=${encodeURIComponent(cleanTable)}`;

      router.push(targetUrl);
    } catch (err: any) {
      console.error('Onboarding exception:', err);
      const fallbackCustomerId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `gst_${Date.now()}`;

      setSession({
        customer_id: fallbackCustomerId,
        session_id: fallbackCustomerId,
        table_number: cleanTable,
        cafe_id: cafeIdParam,
        guest_name: guestName.trim(),
        avatar: '☕',
        business_name: businessName,
        status: 'active',
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('quad_customer_id', fallbackCustomerId);
        localStorage.setItem('quad_guest_uuid', fallbackCustomerId);
        localStorage.setItem('quad_table_number', cleanTable);
        localStorage.setItem('quad_cafe_id', cafeIdParam);
        localStorage.setItem('quad_guest_name', guestName.trim());
      }

      router.push(`/menu?table=${encodeURIComponent(cleanTable)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const dynamicBadgeText = tableNumber.trim()
    ? `${(businessName || GUEST_BRAND.name).toUpperCase()} • ${tableNumber.toUpperCase().replace(/^TABLE\s*/i, 'TABLE ')}`
    : `${GUEST_BRAND.name.toUpperCase()} • WELCOME`;

  return (
    <div className="relative min-h-[100dvh] w-full max-w-full overflow-x-hidden flex items-center justify-center px-6 py-8 selection:bg-white/20 pt-[calc(env(safe-area-inset-top,12px)+1.5rem)] pb-[calc(env(safe-area-inset-bottom,20px)+1.5rem)]">
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster="/videos/onboard-bg-poster.jpg"
        className="fixed inset-0 w-full h-full object-cover z-0"
      >
        <source src="/videos/onboard-bg.mp4" type="video/mp4" />
      </video>

      <div className="fixed inset-0 bg-black/60 backdrop-brightness-90 z-10 pointer-events-none" />

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-20 max-w-sm w-full mx-auto text-center flex flex-col items-center justify-center my-auto min-h-[100dvh]"
      >
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="w-6 h-[1px] bg-gradient-to-r from-transparent to-white/40" />
          <span className="text-[9px] uppercase tracking-[0.4em] font-medium text-neutral-300 font-mono">
            {dynamicBadgeText}
          </span>
          <span className="w-6 h-[1px] bg-gradient-to-l from-transparent to-white/40" />
        </div>

        <h1
          className="text-3xl sm:text-4xl font-serif text-white tracking-tight drop-shadow-md mb-2 leading-[1.18]"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Welcome to <span className="italic block sm:inline font-normal text-white">{businessName}</span>
        </h1>
        <p className="text-xs text-neutral-300 max-w-xs font-light leading-relaxed mb-8">
          Browse our artisanal menu, order directly to your seat, and connect with guests in the live lobby.
        </p>

        <GuestOnboardForm
          guestName={guestName}
          setGuestName={setGuestName}
          tableNumber={tableNumber}
          setTableNumber={setTableNumber}
          availableTables={availableTables}
          isFormValid={isFormValid}
          isLoading={isLoading}
          errorMessage={errorMessage}
          onSubmit={handleSubmit}
        />

        <div className="flex items-center justify-center gap-2 mt-8">
          <span className="w-4 h-[1px] bg-white/20" />
          <p className="text-[9px] tracking-[0.35em] text-neutral-500 uppercase font-mono font-light">
            Concierge Edition
          </p>
          <span className="w-4 h-[1px] bg-white/20" />
        </div>
      </motion.main>
    </div>
  );
}

export default function GuestOnboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="h-5 w-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
        </div>
      }
    >
      <GuestOnboardContent />
    </Suspense>
  );
}
