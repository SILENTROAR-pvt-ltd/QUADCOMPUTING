'use client';

import React from 'react';
import type { HistoricalStayRecord } from '@/types';
import { DigitalReceiptModal, mapFolioToReceipt } from '@/components/shared/DigitalReceipt';

interface Props {
  stay: HistoricalStayRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Unified Stay Invoice & Folio Modal.
 * Replaces the legacy audit layout with the official POS thermal DigitalReceiptModal.
 */
export function PastStayInvoiceModal({ stay, isOpen, onClose }: Props) {
  if (!isOpen || !stay) return null;

  const invoice = mapFolioToReceipt(stay);

  return (
    <DigitalReceiptModal
      invoice={invoice}
      onClose={onClose}
    />
  );
}
