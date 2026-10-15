/**
 * Where an order is in the kitchen, and what the guest is told about it. Plain data and functions, so the wording and the
 * status mapping can be tested without a screen.
 */

export type TrackerStage = 'received' | 'preparing' | 'ready' | 'served';

const READY = ['READY'];
const SERVED = ['SERVED', 'COMPLETED', 'DELIVERED'];
const PREPARING_KOT = ['PREPARING', 'PROCESSING', 'STARTED', 'COOKING', 'IN_PROGRESS'];
const PREPARING_ORDER = ['PREPARING', 'PROCESSING', 'COOKING'];

/**
 * The same mapping the tracker has always used (kitchen ticket status first, then the order's own status), now also telling
 * a dish that is ready from one that has been served, so each gets its own words.
 */
export function resolveTrackerStage(kotStatus: string, orderStatus: string): TrackerStage {
  const kot = (kotStatus || '').toUpperCase();
  const ord = (orderStatus || '').toUpperCase();
  if (SERVED.includes(kot) || SERVED.includes(ord)) return 'served';
  if (READY.includes(kot) || READY.includes(ord)) return 'ready';
  if (PREPARING_KOT.includes(kot) || PREPARING_ORDER.includes(ord)) return 'preparing';
  return 'received';
}

/** 0 received, 1 preparing, 2 ready or served: the position on the three-step line. */
export function stageStep(stage: TrackerStage): number {
  return stage === 'received' ? 0 : stage === 'preparing' ? 1 : 2;
}

/** Which chef clip plays: accepted and being prepared share one, ready and served share the other. */
export type ChefClip = 'preparing' | 'ready';
export function chefClipFor(stage: TrackerStage): ChefClip {
  return stage === 'ready' || stage === 'served' ? 'ready' : 'preparing';
}

export interface StageCopy {
  eyebrow: string;
  headline: string;
  detail: string;
  /** Short, gentle lines shown one at a time under the headline. */
  whispers: string[];
}

export function stageCopy(stage: TrackerStage, table: string): StageCopy {
  const t = table && table !== 'Table' ? `Table ${table}` : 'your table';
  switch (stage) {
    case 'received':
      return {
        eyebrow: 'Order received',
        headline: 'Your order has reached our kitchen',
        detail: `Thank you. Our chefs have the order for ${t} and will begin shortly.`,
        whispers: ['Thank you for dining with us.', 'Every dish is made fresh, to order.', 'Please relax. We will take it from here.'],
      };
    case 'preparing':
      return {
        eyebrow: 'Being prepared',
        headline: 'Your dishes are being prepared',
        detail: 'Our chefs are crafting them fresh, with care.',
        whispers: ['Good food takes time, and it is worth it.', 'Made fresh, just for you.', 'We will bring it over as soon as it is ready.'],
      };
    case 'ready':
      return {
        eyebrow: 'Ready',
        headline: 'Your order is ready',
        detail: `Plated with care. Our team will bring it to ${t} shortly.`,
        whispers: ['Thank you for your patience.', 'Served hot, as it should be.', 'Please let us know if you need anything else.'],
      };
    case 'served':
      return {
        eyebrow: 'Served',
        headline: 'Served with pleasure',
        detail: 'We hope every bite delights. Please enjoy your meal.',
        whispers: ['Anything you need, we are a tap away.', 'Fancy something more? See what else we offer.', 'Ready for the bill? Simply let us know.'],
      };
  }
}

export interface StepCopy { title: string; subtitle: string }

/** The three steps of the line, worded for where the order is now. */
export function stepCopy(stage: TrackerStage): StepCopy[] {
  return [
    { title: 'Received', subtitle: 'Your order is with our kitchen' },
    { title: 'Being prepared', subtitle: 'Crafted fresh by our chefs' },
    { title: stage === 'served' ? 'Served' : 'Ready for you', subtitle: stage === 'served' ? 'Enjoy your meal' : 'Plated and on its way' },
  ];
}

const BASE = '/media/tracker';
/** Versioned file names: a changed clip gets a new name, and the long cache never serves a stale one. */
export const TRACKER_MEDIA = {
  banner: { src: `${BASE}/kitchen-banner-v1.mp4`, poster: `${BASE}/kitchen-banner-v1.webp` },
  preparing: { src: `${BASE}/chef-preparing-v1.mp4`, poster: `${BASE}/chef-preparing-v1.webp` },
  ready: { src: `${BASE}/chef-ready-v1.mp4`, poster: `${BASE}/chef-ready-v1.webp` },
} as const;
