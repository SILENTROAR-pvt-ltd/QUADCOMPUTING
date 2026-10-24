'use client';

import { arrivingServiceRequest, demoEvents, demoGuestEvents, demoLeads, demoLedger, demoOfferRequests, demoOffers, demoServiceRequests } from '@/lib/showcase/demo-growth';

// The showcase pages (QC_SHOWCASE=1 only) draw real host workspaces whose hooks read and write /api routes. Here those
// routes answer from the sample café's data in memory instead, so the recordings show live portal screens and nothing
// is read from or written to a real venue.

type Reply = (url: URL, body: Record<string, unknown>) => unknown;
const state = {
  events: [...demoEvents] as Record<string, unknown>[],
  leadReads: 0,
  leadStatus: {} as Record<string, string>,
  offers: [...demoOffers] as Record<string, unknown>[],
  offerRequests: [...demoOfferRequests],
  services: [...demoServiceRequests] as typeof demoServiceRequests,
  serviceReads: 0,
  guestLead: null as Record<string, unknown> | null,
  redeemReads: 0,
};
const LEAD_ID = '6f1c2a9e-3b4d-4e5f-9a7b-1c2d3e4f5a6b';

const ROUTES: Array<[method: string, path: RegExp, reply: Reply]> = [
  ['GET', /^\/api\/host\/live-events\/import$/, () => ({ success: true, count: 0 })],
  ['GET', /^\/api\/host\/live-events\/leads$/, () => {
    // Each refresh shows a few more people joining the list.
    state.leadReads += 1;
    const shown = demoLeads.slice(demoLeads.length - Math.min(demoLeads.length, 2 + state.leadReads * 3));
    return { success: true, leads: shown.map((l) => ({ ...l, status: state.leadStatus[l.id] ?? l.status })) };
  }],
  ['PATCH', /^\/api\/host\/live-events\/leads$/, (_, b) => { state.leadStatus[String(b.id)] = String(b.status); return { success: true }; }],
  ['GET', /^\/api\/host\/live-events$/, () => ({ success: true, events: state.events })],
  ['POST', /^\/api\/host\/live-events$/, (_, b) => {
    // Second in the list, so the busiest event stays first (and stays the one the interested list opens on).
    const added = { ...demoEvents[0], id: `e${state.events.length + 1}`, title: String(b.title), category: String(b.category), entry_fee: Number(b.entry_fee) || 0,
      starts_at: String(b.starts_at), seats_booked: 0, interested_parties: 0, capacity: Number(b.capacity) || null };
    state.events = [state.events[0], added, ...state.events.slice(1)];
    return { success: true };
  }],
  ['PATCH', /^\/api\/host\/live-events$/, (_, b) => { state.events = state.events.map((e) => (e.id === b.id ? { ...e, status: b.status } : e)); return { success: true }; }],
  ['GET', /^\/api\/host\/guests$/, () => ({ success: true, ...demoLedger })],
  ['GET', /^\/api\/venue\/offers$/, () => ({ success: true, offers: state.offers })],
  ['POST', /^\/api\/venue\/offers$/, (_, b) => {
    state.offers = [{ ...demoOffers[0], id: `o${state.offers.length + 1}`, title: String(b.title), description: String(b.description ?? ''),
      discount_badge: String(b.discount_badge || 'NEW'), created_at: new Date().toISOString() }, ...state.offers];
    return { success: true };
  }],
  ['PATCH', /^\/api\/venue\/offers$/, () => ({ success: true })],
  ['GET', /^\/api\/venue\/requests$/, () => ({ success: true, requests: state.offerRequests })],
  ['PATCH', /^\/api\/venue\/requests$/, (_, b) => { state.offerRequests = state.offerRequests.filter((r) => r.id !== b.id); return { success: true }; }],
  ['GET', /^\/api\/host\/reservations\/services$/, () => {
    state.serviceReads += 1;
    if (state.serviceReads === 3) state.services = [arrivingServiceRequest, ...state.services];
    return { success: true, requests: state.services };
  }],
  ['PATCH', /^\/api\/host\/notifications$/, (_, b) => { state.services = state.services.map((s) => (s.id === b.id ? { ...s, status: 'HANDLED' } : s)); return { success: true }; }],
  // The guest side of the same tools: events with "I'm Interested", and offers redeemed for a code.
  ['GET', /^\/api\/guest\/events$/, () => ({ success: true, events: demoGuestEvents })],
  ['GET', /^\/api\/guest\/events\/prefill$/, () => ({ success: true, signedIn: true, name: 'Aanya Mehra', handle: '@aanya', email: 'aanya@example.com', hasPhone: true })],
  ['GET', /^\/api\/guest\/events\/mine$/, () => ({ success: true, statuses: state.guestLead ? { e1: state.guestLead } : {} })],
  ['POST', /^\/api\/guest\/events\/interest$/, (_, b) => {
    const party = b.party as Record<string, number> | undefined;
    state.guestLead = { lead_id: LEAD_ID, status: 'INTERESTED', party_size: Object.values(party ?? {}).reduce((a, n) => a + Number(n || 0), 0) || 2, updated_at: new Date().toISOString() };
    return { success: true, lead_id: LEAD_ID, message: 'You’re on the guest list. The venue will confirm your place.' };
  }],
  ['POST', /^\/api\/guest\/offers\/requests$/, () => ({ success: true, request: { id: 'rq9', code: 'HH-5130', status: 'open' } })],
  ['GET', /^\/api\/guest\/offers\/requests\/[^/]+$/, () => {
    // The counter settles it a few seconds later, as it would at the till.
    state.redeemReads += 1;
    return { success: true, request: { id: 'rq9', kind: 'redeem', code: 'HH-5130', status: state.redeemReads >= 1 ? 'settled' : 'open', offer_title: demoOffers[0].title } };
  }],
];

declare global { interface Window { __showcaseFetch?: boolean } }

/** Puts the sample answers in front of window.fetch, once; everything else still goes to the network. */
export function installShowcaseFetch() {
  if (typeof window === 'undefined' || window.__showcaseFetch) return;
  window.__showcaseFetch = true;
  const real = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, window.location.origin);
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const route = ROUTES.find(([m, p]) => m === method && p.test(url.pathname));
    if (!route) return real(input, init);
    let body: Record<string, unknown> = {};
    try { body = typeof init?.body === 'string' ? JSON.parse(init.body) : {}; } catch { /* not JSON */ }
    return new Response(JSON.stringify(route[2](url, body)), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
}
