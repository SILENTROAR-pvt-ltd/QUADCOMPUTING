import type { Metadata, Viewport } from 'next';
import { GUEST_BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Menu · ${GUEST_BRAND.name}`,
  description: GUEST_BRAND.tagline,
  applicationName: GUEST_BRAND.name,
};

export const viewport: Viewport = {
  themeColor: '#f5f1e8',
};

export default function GuestMenuLayout({ children }: { children: React.ReactNode }) {
  return children;
}
