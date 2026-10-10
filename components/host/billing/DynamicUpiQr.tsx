'use client';

import { QRCodeSVG } from 'qrcode.react';
import { generateUpiIntentUri } from '@/lib/utils/upi';

interface DynamicUpiQrProps {
  /** Merchant VPA handle (e.g. merchant@oksbi) */
  upiId: string;
  /** Merchant / Business display name */
  businessName: string;
  /** Exact order amount in INR */
  amount: number;
  /** Optional order ID for transaction reference */
  orderId?: string;
  /** QR code pixel size (default: 160) */
  size?: number;
}

/**
 * Production-grade Dynamic UPI QR Code component.
 * Generates a real-time UPI intent QR that auto-fills the exact payment amount
 * when scanned by any UPI app (GPay, PhonePe, Paytm, BHIM).
 *
 * Includes print-optimized styles for thermal receipt printers (2"/3").
 */
export function DynamicUpiQr({
  upiId,
  businessName,
  amount,
  orderId,
  size = 160,
}: DynamicUpiQrProps) {
  const upiUri = generateUpiIntentUri({ upiId, businessName, amount, orderId });

  return (
    <div className="upi-qr-block flex flex-col items-center gap-3">
      <p className="font-bold tracking-widest uppercase text-center text-[10px]">
        Scan to Pay via UPI
      </p>

      {/* QR Code with high-contrast border for thermal printing */}
      <div className="rounded-lg border-2 border-zinc-950 p-2 bg-white print:border-black">
        <QRCodeSVG
          value={upiUri}
          size={size}
          level="M"
          bgColor="#ffffff"
          fgColor="#09090b"
          className="print:!w-[100px] print:!h-[100px]"
        />
      </div>

      {/* Payee metadata strip */}
      <div className="flex flex-col items-center gap-0.5 text-[9px] text-zinc-500 text-center">
        <span>Payee: <strong className="text-zinc-700">{businessName}</strong></span>
        <span>VPA: <strong className="text-zinc-700 font-mono">{upiId}</strong></span>
      </div>

      {/* Dynamic amount badge */}
      <div className="rounded-md bg-zinc-950 px-3 py-1 print:bg-black">
        <span className="font-mono text-xs font-bold text-white tracking-wide print:text-white">
          {'\u20B9'}{amount.toFixed(2)}
        </span>
      </div>

      <p className="text-[8px] text-zinc-400 text-center max-w-[200px] print:text-black">
        Scan with GPay / PhonePe / Paytm to pay exact amount
      </p>

      {/* Print-optimized styles */}
      <style jsx>{`
        @media print {
          .upi-qr-block {
            page-break-inside: avoid;
            margin: 8px auto;
          }
          .upi-qr-block * {
            color: #000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
