'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { BLUR_PLACEHOLDER } from './motion';

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;

/**
 * A dish photo that fills its square: lazy, sized for the two-column grid, with a grey blur until it arrives so the
 * tile never reflows. A dish with no photo (or a photo that fails) shows its first letter instead.
 */
export function DishImage({ src, name, priority = false }: { src?: string | null; name: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <div className="flex h-full w-full items-center justify-center text-4xl text-zinc-400" style={SERIF} aria-hidden>{name.charAt(0)}</div>;
  }
  return (
    <Image
      src={src}
      alt={name}
      fill
      sizes="(min-width: 768px) 230px, 46vw"
      loading={priority ? 'eager' : 'lazy'}
      placeholder="blur"
      blurDataURL={BLUR_PLACEHOLDER}
      onError={() => setFailed(true)}
      className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
    />
  );
}
