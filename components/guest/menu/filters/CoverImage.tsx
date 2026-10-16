"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { stickerFor, stickerSrc } from "@/lib/guest/menu-stickers";
import { chipPhoto } from "@/lib/guest/category-covers";

interface CoverImageProps {
  category: string;
  cover?: string;
  size: number;
  eager: boolean;
  className: string;
}

/**
 * A category's picture: the venue's own dish photo, small; the full photo if the small one cannot load; and the food
 * sticker when the category has no photo at all.
 */
export function CoverImage({ category, cover, size, eager, className }: CoverImageProps) {
  const [failed, setFailed] = useState<readonly string[]>([]);
  const src = useMemo(() => (cover ? [chipPhoto(cover), cover].find((url) => !failed.includes(url)) : undefined), [cover, failed]);
  if (!src) {
    return <Image src={stickerSrc(stickerFor(category))} alt="" width={size} height={size} unoptimized className={`${className} object-contain p-[12%]`} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- dish photos come from the venue's storage, already sized by chipPhoto
    <img src={src} alt="" width={size} height={size} loading={eager ? "eager" : "lazy"} decoding="async" onError={() => setFailed((f) => [...f, src])} className={`${className} object-cover`} />
  );
}
