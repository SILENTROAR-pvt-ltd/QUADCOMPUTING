'use client';

import { DigitalReceipt } from '@/components/shared/DigitalReceipt';
import type { InvoiceData } from '@/lib/utils/receipt-adapter';

interface Props {
  invoice: InvoiceData;
  isOnline: boolean;
  paymentMethod: 'UPI' | 'CASH' | 'CARD';
  masterUpiHandle: string;
  businessDisplayName: string;
}

/**
 * Re-export DigitalReceipt as PrintableInvoiceReceipt for seamless backward compatibility.
 */
export function PrintableInvoiceReceipt(props: Props) {
  return <DigitalReceipt {...props} />;
}
