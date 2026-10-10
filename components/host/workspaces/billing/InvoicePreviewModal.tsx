'use client';

import { DigitalReceiptModal } from '@/components/shared/DigitalReceipt';
import type { InvoiceData } from '@/lib/utils/receipt-adapter';

export type { InvoiceData };

interface Props {
  invoice: InvoiceData;
  onClose: () => void;
  onSuccess?: (paymentMethod: 'UPI' | 'CASH' | 'CARD') => void;
}

/**
 * Re-export DigitalReceiptModal as InvoicePreviewModal for seamless backward compatibility.
 */
export function InvoicePreviewModal(props: Props) {
  return <DigitalReceiptModal {...props} />;
}
