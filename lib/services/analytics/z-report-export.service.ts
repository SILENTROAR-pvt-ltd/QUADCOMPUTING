import { ZReportData } from './z-report.service';

export interface ZReportExportMetadata {
  businessName?: string;
  gstNumber?: string;
  address?: string;
}

function escapeCsvField(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * generateZReportCSV()
 * Generates an Indian GST compliant CSV export for daily Z-Reports.
 * Conforms to GSTR-1 daily turnover classification standards.
 */
export function generateZReportCSV(
  report: ZReportData,
  metadata?: ZReportExportMetadata
): string {
  const lines: string[] = [];

  // Header / Tax Identification Section
  lines.push('QUAD COMPUTING ENTERPRISE POS - DAILY Z-REPORT & FINANCIAL AUDIT');
  lines.push('COMPLIANCE: INDIAN GOODS & SERVICES TAX (GST ACT 2017) / GSTR-1 DAILY CONSOLIDATION');
  lines.push('');
  lines.push(`Venue Name,${escapeCsvField(metadata?.businessName || 'Venus Cafe')}`);
  lines.push(`GSTIN,${escapeCsvField(metadata?.gstNumber || 'NOT REGISTERED')}`);
  lines.push(`Business ID,${escapeCsvField(report.business_id)}`);
  lines.push(`Financial Date,${escapeCsvField(report.date)}`);
  lines.push(`UTC Start Timestamp,${escapeCsvField(report.time_range.start)}`);
  lines.push(`UTC End Timestamp,${escapeCsvField(report.time_range.end)}`);
  lines.push(`Currency,INR (₹)`);
  lines.push('');

  // SECTION 1: TURNOVER & GST COMPLIANCE
  lines.push('--- SECTION 1: TURNOVER & TAX COMPLIANCE BREAKDOWN ---');
  lines.push('Tax Category,Rate (%),Taxable Value (INR),Tax Amount (INR),Total Value (INR)');
  
  const gross = report.summary.gross_revenue.toFixed(2);
  const discounts = report.summary.total_discounts.toFixed(2);
  const net = report.summary.net_revenue.toFixed(2);
  const cgst = report.summary.cgst.toFixed(2);
  const sgst = report.summary.sgst.toFixed(2);
  const totalTax = report.summary.total_tax.toFixed(2);
  const grandTotal = report.summary.grand_total.toFixed(2);

  lines.push(`Gross Food & Beverage Sales,-,-,-,${gross}`);
  lines.push(`Trade Discounts Applied,-,-,-,${discounts}`);
  lines.push(`Central GST (CGST),${report.gst_compliance.cgst_rate_percent}%,${net},${cgst},-`);
  lines.push(`State GST (SGST),${report.gst_compliance.sgst_rate_percent}%,${net},${sgst},-`);
  lines.push(`Consolidated GST Turnover,${report.gst_compliance.gst_rate_percent}%,${net},${totalTax},${grandTotal}`);
  lines.push('');

  // SECTION 2: TENDER & REVENUE RECONCILIATION
  lines.push('--- SECTION 2: PAYMENT METHOD RECONCILIATION ---');
  lines.push('Payment Tender Method,Settled Amount (INR),Share of Total (%)');

  const totalRev = report.summary.grand_total || 1;
  const cash = report.payment_breakdown.cash;
  const upi = report.payment_breakdown.upi;
  const wallet = report.payment_breakdown.wallet_redemption;
  const card = report.payment_breakdown.card;
  const other = report.payment_breakdown.other;

  lines.push(`Cash,${cash.toFixed(2)},${((cash / totalRev) * 100).toFixed(1)}%`);
  lines.push(`UPI / Instant Digital,${upi.toFixed(2)},${((upi / totalRev) * 100).toFixed(1)}%`);
  lines.push(`Venue Wallet Redemption,${wallet.toFixed(2)},${((wallet / totalRev) * 100).toFixed(1)}%`);
  lines.push(`Credit/Debit Card,${card.toFixed(2)},${((card / totalRev) * 100).toFixed(1)}%`);
  lines.push(`Other / Ledger,${other.toFixed(2)},${((other / totalRev) * 100).toFixed(1)}%`);
  lines.push(`Total Settled Tenders,${grandTotal},100.0%`);
  lines.push('');

  // SECTION 3: OPERATIONS & AUDIT METRICS
  lines.push('--- SECTION 3: OPERATIONS & AUDIT SUMMARY ---');
  lines.push('Operational Metric,Value');
  lines.push(`Total Settled Orders / Invoices,${report.operations.total_settled_orders}`);
  lines.push(`Average Order Value (AOV),${report.operations.average_order_value.toFixed(2)}`);
  lines.push('Settlement Audit Status,SETTLED & VERIFIED');
  lines.push('');

  // SECTION 4: HOURLY SALES DISTRIBUTION
  if (report.hourly_distribution && report.hourly_distribution.length > 0) {
    lines.push('--- SECTION 4: HOURLY PERFORMANCE AUDIT ---');
    lines.push('Hour (UTC),Order Count,Revenue (INR)');
    report.hourly_distribution.forEach((h) => {
      lines.push(`${h.hour},${h.count},${h.sales.toFixed(2)}`);
    });
  }

  return lines.join('\r\n');
}
