'use client';

import React from 'react';

/** Shown when the menu cannot be loaded: say why, and offer one clear way to try again. */
export function MenuUnavailable({ message }: { message: string }) {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-[#faf9f6] px-6 text-center">
      <h1 className="mb-2 text-3xl text-zinc-950" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Menu unavailable</h1>
      <p className="mb-6 max-w-sm text-sm text-zinc-500">{message}</p>
      <button type="button" onClick={() => window.location.reload()}
        className="h-11 cursor-pointer rounded-full bg-zinc-950 px-6 text-xs font-semibold uppercase tracking-widest text-white active:scale-95">
        Try again
      </button>
    </div>
  );
}
