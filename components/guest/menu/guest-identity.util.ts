import { walletAuthHeaders } from '@/lib/utils/wallet-secret';

export interface IdentityProfile {
  name: string;
  handle: string;
  phone: string;
  avatar: string;
}

export const CURATED_AVATARS = [
  { id: 'connoisseur', label: 'Connoisseur', icon: '🎩' },
  { id: 'voyager', label: 'Voyager', icon: '🧭' },
  { id: 'executive', label: 'Executive', icon: '💼' },
  { id: 'artisan', label: 'Artisan', icon: '🎨' },
  { id: 'maverick', label: 'Maverick', icon: '⚡' },
  { id: 'nomad', label: 'Nomad', icon: '⛺' },
] as const;

export function sanitizeHandle(raw: string): string {
  const noPrefix = raw.startsWith('@') ? raw.slice(1) : raw;
  const clean = noPrefix.toLowerCase().replace(/[^a-z0-9_.]/g, '');
  return clean ? `@${clean}` : '';
}

export async function syncGuestWalletIdentity(
  cafeId: string | undefined,
  tableNumber: string | undefined,
  profile: IdentityProfile
) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('quad_guest_name', profile.name);
  localStorage.setItem('guest_name', profile.name);
  localStorage.setItem('guest_handle', profile.handle);
  localStorage.setItem('quad_guest_wallet_id', profile.handle);
  localStorage.setItem('quad_guest_phone', profile.phone);
  localStorage.setItem('guest_avatar', profile.avatar);

  const calls: Promise<any>[] = [];
  if (cafeId && profile.handle) {
    calls.push(
      fetch(`/api/guest/wallet?guest_id=${encodeURIComponent(profile.handle)}&cafe_id=${encodeURIComponent(cafeId)}`, { headers: walletAuthHeaders() }).catch(() => {})
    );
  }
  if (cafeId && tableNumber) {
    calls.push(
      fetch('/api/guest/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_number: tableNumber, business_id: cafeId, guest_name: profile.name,
          guest_handle: profile.handle, customer_phone: profile.phone, avatar: profile.avatar,
        }),
      }).catch(() => {})
    );
  }
  await Promise.allSettled(calls);
}
