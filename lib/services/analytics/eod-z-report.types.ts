export interface ZSummary {
  /** Menu value of settled bills before any discount. */
  gross_sales: number;
  /** All discounts, wallet credit included. */
  discounts: number;
  /** The part of `discounts` that guests paid with wallet credit. */
  wallet_redeemed: number;
  net_sales: number;
  cgst: number;
  sgst: number;
  total_tax: number;
  /** Rounding between computed totals and what the bills charged. */
  round_off: number;
  grand_total: number;
}

export interface ZTenders {
  /** Cash sales: the bills paid in cash (what the drawer keeps). */
  cash: number;
  upi: number;
  card: number;
  other: number;
  /** Notes handed over for those bills, and the change that went back; cash = cash_received − change_given. */
  cash_received: number;
  change_given: number;
}

export interface ZOperations {
  settled_bills: number;
  avg_bill: number;
  guests: number;
  open_bills: number;
  open_value: number;
  voids: number;
  void_value: number;
  first_bill_at: string | null;
  last_bill_at: string | null;
}

export interface ZSalesLine { name: string; qty: number; net_sales: number; share: number }
export interface ZHour { hour: string; bills: number; sales: number }

export interface EodZReport {
  success: true;
  truncated: boolean;
  generated_at: string;
  venue: { name: string; gstin: string | null };
  period: { from: string; to: string; start: string; end: string };
  summary: ZSummary;
  tenders: ZTenders;
  operations: ZOperations;
  categories: ZSalesLine[];
  items: ZSalesLine[];
  hourly: ZHour[];
}

export type ZFigures = Pick<EodZReport, 'summary' | 'tenders' | 'operations' | 'categories' | 'items' | 'hourly'>;
