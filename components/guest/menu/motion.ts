/** Shared motion for the guest menu: one feel for every press, so nothing is a plain instant jump. */
export const SPRING = { type: 'spring', stiffness: 520, damping: 30, mass: 0.6 } as const;

/** Spread onto a framer-motion button: it dips under the finger and springs back. */
export const press = { whileTap: { scale: 0.92 }, transition: SPRING } as const;

/** A softer press for large surfaces (cards, bars). */
export const pressSoft = { whileTap: { scale: 0.985 }, transition: SPRING } as const;

/** A tiny grey square the browser stretches while a photo loads, so the tile never flashes empty. */
export const BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNlNGU0ZTciLz48L3N2Zz4=';
