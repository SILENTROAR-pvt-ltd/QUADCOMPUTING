// Written by scripts/capture-landing-shots.mjs. Product screenshots with a fictional café's data.
export const SCREENSHOTS = {
  "overview": {
    "src": "/images/landing/screens/overview.webp",
    "width": 1600,
    "height": 1519,
    "alt": "Analytics: total sales, bills, net profit, GST, sales by hour, channels, categories and connected guests"
  },
  "dues": {
    "src": "/images/landing/screens/dues.webp",
    "width": 1600,
    "height": 1410,
    "alt": "Dues: You earn and We earn, with daily bars and how guests paid"
  },
  "pnl": {
    "src": "/images/landing/screens/pnl.webp",
    "width": 1100,
    "height": 1217,
    "alt": "Profit and loss: revenue, cost of goods, every expense and net profit"
  },
  "items-stock": {
    "src": "/images/landing/screens/items-stock.webp",
    "width": 1400,
    "height": 809,
    "alt": "Top-selling dishes and the stock control panel"
  },
  "slip": {
    "src": "/images/landing/screens/slip.webp",
    "width": 1200,
    "height": 801,
    "alt": "A daily due slip, 10 AM to 10 PM, with each bill and its fee"
  },
  "delivery": {
    "src": "/images/landing/screens/delivery.webp",
    "width": 1400,
    "height": 439,
    "alt": "Delivery orders with address, payment and the next step"
  },
  "vendors": {
    "src": "/images/landing/screens/vendors.webp",
    "width": 1400,
    "height": 345,
    "alt": "Vendors with their QR codes and one-tap WhatsApp"
  }
} as const;

export type ScreenshotId = keyof typeof SCREENSHOTS;
