import type { Metadata, Viewport } from 'next';
import { GUEST_BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Menu · ${GUEST_BRAND.name}`,
  description: GUEST_BRAND.tagline,
  applicationName: GUEST_BRAND.name,
};

export const viewport: Viewport = {
  themeColor: '#faf9f6',
};

export default function GuestMenuLayout({ children }: { children: React.ReactNode }) {
  return children;
}
