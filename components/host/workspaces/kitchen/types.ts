import type { KitchenTicket } from '@/lib/utils/kitchen';

export type KOTFilter = 'ALL' | 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED';

export interface ChefTicketCardProps {
  ticket: KitchenTicket;
  onStatusChange: (status: KitchenTicket['status']) => void;
  onToggleItemDone: (idx: number) => void;
  nowMs?: number;
}

export interface KitchenStatusFilterBarProps {
  filter: KOTFilter;
  onFilterChange: (filter: KOTFilter) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  totalCount: number;
  pendingCount: number;
  preparingCount: number;
  readyCount: number;
  deliveredCount: number;
}

export interface KitchenHeaderProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
}
