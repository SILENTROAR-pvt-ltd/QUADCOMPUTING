import type {
  VenueSubscription,
  VenueWallet,
  UsageLedgerItem,
  VenueTopupRequest,
} from '@/types/wallet';

export const mem = new Map<
  string,
  { wallet: VenueWallet; subscription: VenueSubscription; ledger: UsageLedgerItem[] }
>();

export const memTopupRequests: VenueTopupRequest[] = [];
