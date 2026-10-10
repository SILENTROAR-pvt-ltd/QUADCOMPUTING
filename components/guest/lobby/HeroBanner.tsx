// components/guest/lobby/HeroBanner.tsx
'use client';

import Image from 'next/image';

export default function HeroBanner() {
  return (
    <div className="relative w-full h-[280px] sm:h-[320px] md:h-[340px] rounded-3xl overflow-hidden border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
      {/* Cinematic Background Image */}
      <Image
        src="/images/lobby-hero.jpg"
        alt="Social Lobby Cinematic Banner"
        fill
        priority
        className="object-cover object-center"
        sizes="(max-width: 1024px) 100vw, 1024px"
      />

      {/* Dark Ambient Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/50 to-neutral-950/30" />
      <div className="absolute inset-0 bg-radial from-transparent via-neutral-950/20 to-neutral-950/70" />

      {/* Tagline Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 sm:px-8 z-10">
        {/* Eyebrow Label */}
        <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.35em] text-white/70 font-mono mb-2.5 sm:mb-3 drop-shadow">
          Live Social Floor
        </span>

        {/* Main Serif Tagline */}
        <h2
          className="font-serif text-2xl sm:text-4xl md:text-[2.75rem] font-normal text-white leading-tight sm:leading-snug max-w-2xl tracking-tight"
          style={{ textShadow: '0 4px 30px rgba(0,0,0,0.8), 0 1px 3px rgba(0,0,0,0.9)' }}
        >
          Getting bored? <span className="italic font-light text-white">Interact</span> with guests
          <br className="hidden sm:inline" /> sitting beside you.
        </h2>

        {/* Subtitle */}
        <p
          className="mt-3 sm:mt-4 text-xs sm:text-sm text-neutral-300 font-light max-w-md tracking-wide leading-relaxed"
          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}
        >
          Tap any active table node below to send a drink, join a table, or drop a note.
        </p>
      </div>
    </div>
  );
}
