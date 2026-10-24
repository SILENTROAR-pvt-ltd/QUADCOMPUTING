// Written by scripts/record-landing-videos.mjs. Recordings of the product with a fictional café's data.
export const VIDEOS = {
  "guest-menu": {
    "src": "/media/landing/guest-menu-v3.mp4",
    "poster": "/media/landing/guest-menu-poster-v3.webp",
    "width": 600,
    "height": 1111,
    "alt": "The guest menu in use: the venue banner, top picks, category bars opening to dishes, and the tray filling"
  },
  "guest-tracker": {
    "src": "/media/landing/guest-tracker-v3.mp4",
    "poster": "/media/landing/guest-tracker-poster-v3.webp",
    "width": 600,
    "height": 1111,
    "alt": "The live order tracker moving from received to ready, then the bill and wallet"
  },
  "dues-phone": {
    "src": "/media/landing/dues-phone-v1.mp4",
    "poster": "/media/landing/dues-phone-poster-v1.webp",
    "width": 600,
    "height": 1111,
    "alt": "Dues on a phone: You earn and We earn, the split, and how guests paid"
  },
  "overview": {
    "src": "/media/landing/overview-v1.mp4",
    "poster": "/media/landing/overview-poster-v1.webp",
    "width": 1280,
    "height": 760,
    "alt": "The analytics dashboard: totals, sales by hour, channels, categories and guests"
  },
  "guest-vibey": {
    "src": "/media/landing/guest-vibey-v3.mp4",
    "poster": "/media/landing/guest-vibey-poster-v3.webp",
    "width": 600,
    "height": 1111,
    "alt": "Vibey, the ordering chat: one message fills the tray and suggests dishes to share"
  },
  "guest-lounge": {
    "src": "/media/landing/guest-lounge-v3.mp4",
    "poster": "/media/landing/guest-lounge-poster-v3.webp",
    "width": 600,
    "height": 1111,
    "alt": "The Vibers Lounge: memory postcards from guests, liked with a double tap"
  },
  "pos-billing": {
    "src": "/media/landing/pos-billing-v3.mp4",
    "poster": "/media/landing/pos-billing-poster-v3.webp",
    "width": 1280,
    "height": 760,
    "alt": "The POS in use: picking table T-04, tapping dishes, searching the menu, and the receipt adding GST and cashback"
  },
  "kitchen-board": {
    "src": "/media/landing/kitchen-board-v3.mp4",
    "poster": "/media/landing/kitchen-board-poster-v3.webp",
    "width": 1280,
    "height": 760,
    "alt": "The live kitchen board: a ticket started, a dish ticked off, a ticket marked ready, and a new order arriving"
  },
  "host-events": {
    "src": "/media/landing/host-events-v3.mp4",
    "poster": "/media/landing/host-events-poster-v3.webp",
    "width": 1280,
    "height": 760,
    "alt": "My Guests: publishing a live event, then the interested guest list filling up and a party confirmed"
  },
  "host-offers": {
    "src": "/media/landing/host-offers-v3.mp4",
    "poster": "/media/landing/host-offers-poster-v3.webp",
    "width": 1280,
    "height": 760,
    "alt": "Live offers: publishing a new offer, and guests’ redemption codes settled at the counter"
  },
  "host-services": {
    "src": "/media/landing/host-services-v3.mp4",
    "poster": "/media/landing/host-services-poster-v3.webp",
    "width": 1280,
    "height": 760,
    "alt": "Services and partners: guests’ service requests ringing in from the menu, handled one by one"
  }
} as const;

export type VideoId = keyof typeof VIDEOS;
