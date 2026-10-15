'use client';

import { DigitalReceiptModal } from '@/components/shared/DigitalReceipt';
import type { InvoiceData } from '@/lib/utils/receipt-adapter';
import type { SaveResult } from '@/components/shared/receipt/useDigitalReceiptActions';

export type { InvoiceData };

interface Props {
  invoice: InvoiceData;
  onClose: () => void;
  onSuccess?: (paymentMethod: 'UPI' | 'CASH' | 'CARD', result: SaveResult) => void | Promise<void>;
}

/**
 * Re-export DigitalReceiptModal as InvoicePreviewModal for seamless backward compatibility.
 */
export function InvoicePreviewModal(props: Props) {
  return <DigitalReceiptModal {...props} />;
}
