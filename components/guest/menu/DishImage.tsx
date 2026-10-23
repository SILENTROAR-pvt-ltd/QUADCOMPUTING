'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { BLUR_PLACEHOLDER } from './motion';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';

/**
 * A dish photo that fills its square: lazy, sized for the two-column grid, with a grey blur until it arrives so the
 * tile never reflows. A dish with no photo (or a photo that fails) shows its first letter instead.
 */
export function DishImage({ src, name, priority = false }: { src?: string | null; name: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <div className="flex h-full w-full items-center justify-center text-5xl italic text-[#b08d57]" style={LUXE_SERIF} aria-hidden>{name.charAt(0)}</div>;
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
      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
    />
  );
}
