/** Marks the element a dish "flies" to when it is added: the tray bar's bag. */
export const CART_TARGET_ATTR = 'data-cart-target';

/**
 * A small dot that arcs from `from` (the tapped add button) to the tray bar's bag, so an add is felt as well as seen.
 * Pure DOM and the Web Animations API: nothing re-renders, nothing is left behind, and it is skipped for reduced motion
 * or when the tray bar is not on screen yet (the first add: the bar itself slides in).
 */
export function flyToCart(from: Element | null, color = '#0A3222'): void {
  if (typeof document === 'undefined' || !from || typeof Element.prototype.animate !== 'function') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const target = document.querySelector(`[${CART_TARGET_ATTR}]`);
  if (!target) return;
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  if (!b.width || !a.width) return;

  const dot = document.createElement('span');
  dot.setAttribute('aria-hidden', 'true');
  Object.assign(dot.style, {
    position: 'fixed', left: '0', top: '0', width: '14px', height: '14px', borderRadius: '9999px',
    background: color, boxShadow: '0 4px 12px rgba(0,0,0,0.35)', pointerEvents: 'none', zIndex: '140', willChange: 'transform',
  });
  document.body.appendChild(dot);

  const x0 = a.left + a.width / 2 - 7;
  const y0 = a.top + a.height / 2 - 7;
  const x1 = b.left + b.width / 2 - 7;
  const y1 = b.top + b.height / 2 - 7;
  const lift = Math.min(90, Math.abs(y0 - y1) / 2 + 30);
  const anim = dot.animate(
    [
      { transform: `translate(${x0}px, ${y0}px) scale(1)`, opacity: 1 },
      { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - lift}px) scale(1.15)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${x1}px, ${y1}px) scale(0.35)`, opacity: 0.2 },
    ],
    { duration: 520, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' },
  );
  const done = () => dot.remove();
  anim.onfinish = done;
  anim.oncancel = done;
}
