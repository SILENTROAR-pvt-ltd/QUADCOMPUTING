// Client-side proof of wallet ownership. The server stores only a hash of this secret and binds it to
// the guest's handle/phone the first time it is used (see wallet-claim.service.ts). Losing browser
// storage means losing access to that wallet from this device, by design.
const STORAGE_KEY = 'quad_guest_wallet_secret';
export const WALLET_SECRET_HEADER = 'x-guest-wallet-secret';

function generateSecret(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${crypto.randomUUID()}${crypto.randomUUID().replace(/-/g, '')}`;
    }
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {}
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

export function getWalletSecret(): string {
  if (typeof window === 'undefined') return '';
  try {
    let secret = localStorage.getItem(STORAGE_KEY);
    if (!secret) {
      secret = generateSecret();
      localStorage.setItem(STORAGE_KEY, secret);
    }
    return secret;
  } catch {
    return '';
  }
}

/** Headers for any call that reads or spends a guest wallet. */
export function walletAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const secret = getWalletSecret();
  return secret ? { ...extra, [WALLET_SECRET_HEADER]: secret } : { ...extra };
}
