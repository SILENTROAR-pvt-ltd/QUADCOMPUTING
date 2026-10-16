// Written by scripts/record-landing-videos.mjs. Recordings of the product with a fictional café's data.
export const VIDEOS = {
  "guest-menu": {
    "src": "/media/landing/guest-menu-v1.mp4",
    "poster": "/media/landing/guest-menu-poster-v1.webp",
    "width": 600,
    "height": 1111,
    "alt": "The guest menu in use: scrolling the dishes and adding them to the tray"
  },
  "guest-tracker": {
    "src": "/media/landing/guest-tracker-v1.mp4",
    "poster": "/media/landing/guest-tracker-poster-v1.webp",
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
  }
} as const;

export type VideoId = keyof typeof VIDEOS;
