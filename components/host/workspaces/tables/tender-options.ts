import { Banknote, CreditCard, Smartphone } from 'lucide-react';
import type { Tender } from './useTableActions';

/** How a guest can have paid, as the waiter picks it when settling a table. */
export const TENDERS: { id: Tender; label: string; Icon: typeof Banknote }[] = [
  { id: 'CASH', label: 'Cash', Icon: Banknote },
  { id: 'UPI', label: 'UPI', Icon: Smartphone },
  { id: 'CARD', label: 'Card', Icon: CreditCard },
];
