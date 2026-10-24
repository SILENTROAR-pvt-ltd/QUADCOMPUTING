/** The sample café's growth tools for the landing recordings: its events and their guest lists, offers, and guests'
 *  service requests. Every name, number and contact is made up. */
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const inDays = (d: number, hour: number) => { const t = new Date(); t.setDate(t.getDate() + d); t.setHours(hour, 0, 0, 0); return t.toISOString(); };

const event = (id: string, title: string, category: string, d: number, hour: number, fee: number, cap: number, booked: number, parties: number, status = 'LIVE') => ({
  id, title, description: null, banner_url: null, category, starts_at: inDays(d, hour), ends_at: null, entry_fee: fee, perks: [],
  capacity: cap, male_capacity: null, female_capacity: null, status, seats_booked: booked, men_booked: 0, women_booked: 0, interested_parties: parties,
});

export const demoEvents = [
  event('e1', 'Rooftop Sundowner Sessions', 'Live Music', 1, 19, 0, 120, 96, 38),
  event('e2', 'Sunday Brunch Club', 'Brunch', 2, 11, 899, 60, 41, 17),
  event('e3', 'Bollywood Retro Night', 'DJ Night', 6, 21, 499, 150, 22, 9, 'DRAFT'),
];

const lead = (i: number, name: string, handle: string | null, size: number, men: number, women: number, h: number) => ({
  id: `l${i}`, guest_name: name, vibers_handle: handle, email: null, phone: `+91 90000 ${String(10000 + i * 37).slice(-5)}`,
  party_size: size, party_male: men, party_female: women, party_other: 0, status: 'INTERESTED', created_at: hoursAgo(h),
});

/** The interested list, newest first; the recording's refresh shows more arriving. */
export const demoLeads = [
  lead(1, 'Ira Kapoor', '@ira.k', 4, 2, 2, 0.2), lead(2, 'Kabir Malhotra', null, 2, 1, 1, 0.4), lead(3, 'Zoya Fernandes', '@zoyaf', 6, 3, 3, 0.9),
  lead(4, 'Arjun Rao', '@arjunr', 3, 2, 1, 1.5), lead(5, 'Meher Sethi', null, 2, 0, 2, 2.2), lead(6, 'Dev Anand Iyer', '@dev.i', 5, 3, 2, 3.1),
  lead(7, 'Tara Menon', '@taram', 2, 1, 1, 4), lead(8, 'Rohan Bhatia', null, 4, 2, 2, 5.5),
];

export const demoLedger = {
  metrics: { totalGuests: 1284, repeatVisitors: 412, totalEventLeads: 236, stayGuests: 58, nights: 141 },
  highSpenderThreshold: 8000, recentDays: 14,
  guests: [
    { id: 'g1', guest_name: 'Aanya Mehra', vibers_handle: '@aanya', email: null, phone: '+91 90000 11021', visits: 14, total_spend: 18640, event_leads: 3, last_visit_at: hoursAgo(1), stays: 1, nights: 2 },
    { id: 'g2', guest_name: 'Ira Kapoor', vibers_handle: '@ira.k', email: null, phone: '+91 90000 10037', visits: 9, total_spend: 11320, event_leads: 2, last_visit_at: hoursAgo(26), stays: 0, nights: 0 },
    { id: 'g3', guest_name: 'Neel Joshi', vibers_handle: null, email: null, phone: '+91 90000 00047', visits: 6, total_spend: 7480, event_leads: 1, last_visit_at: hoursAgo(50), stays: 0, nights: 0 },
    { id: 'g4', guest_name: 'Zoya Fernandes', vibers_handle: '@zoyaf', email: null, phone: '+91 90000 10111', visits: 4, total_spend: 5260, event_leads: 2, last_visit_at: hoursAgo(72), stays: 0, nights: 0 },
  ],
};

const offer = (id: string, title: string, description: string, badge: string, category: 'room' | 'food' | 'general', active = true) => ({
  id, venue_id: 'demo', title, description, category, discount_badge: badge, valid_until: inDays(10, 23), is_active: active, created_at: hoursAgo(48),
});

export const demoOffers = [
  offer('o1', 'Happy hours, 5 to 8 PM', 'Every cocktail and mocktail, buy one get one.', 'BOGO', 'food'),
  offer('o2', 'Weekday brunch for two', 'Two mains, two coffees and a dessert to share.', '20% OFF', 'food'),
  offer('o3', 'Stay two nights, third on us', 'For bookings made from the lounge this month.', 'FREE NIGHT', 'room', false),
];

export const demoOfferRequests = [
  { id: 'r1', kind: 'redeem', code: 'HH-4821', offer_title: 'Happy hours, 5 to 8 PM', status: 'open', table_number: 'T-04', guest_name: 'Aanya Mehra', message: null, created_at: hoursAgo(0.05) },
  { id: 'r2', kind: 'redeem', code: 'BR-1176', offer_title: 'Weekday brunch for two', status: 'open', table_number: 'T-08', guest_name: 'Kabir Malhotra', message: null, created_at: hoursAgo(0.3) },
  { id: 'r3', kind: 'inquiry', code: null, offer_title: 'Stay two nights, third on us', status: 'open', table_number: 'T-02', guest_name: 'Zoya Fernandes', message: 'Does this work for a family room?', created_at: hoursAgo(0.8) },
];

export const demoServiceRequests = [
  { id: 's1', table_number: 'T-04', message: 'Bicycle rental (₹250)', status: 'PENDING', created_at: hoursAgo(0.03) },
  { id: 's2', table_number: 'T-07', message: 'Bonfire setup (₹1,500)', status: 'PENDING', created_at: hoursAgo(0.2) },
  { id: 's3', table_number: 'T-02', message: 'Airport drop (₹1,200)', status: 'PENDING', created_at: hoursAgo(0.6) },
  { id: 's4', table_number: 'T-09', message: 'Guided heritage walk (₹600)', status: 'HANDLED', created_at: hoursAgo(3) },
];

/** The request that arrives while the recording runs, the way a guest's tap lands on the list. */
export const arrivingServiceRequest = { id: 's5', table_number: 'T-06', message: 'Couple spa session (₹2,400)', status: 'PENDING', created_at: new Date().toISOString() };
