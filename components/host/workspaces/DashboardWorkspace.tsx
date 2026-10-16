'use client';

import { EodZReportModal } from '@/components/host/modals/EodZReportModal';
import { OrdersListSheet } from '@/components/host/modals/OrdersListSheet';
import { KitchenTicketsSheet } from '@/components/host/modals/KitchenTicketsSheet';
import { DashboardHeader } from './dashboard/DashboardHeader';
import { KpiStrip } from './dashboard/KpiStrip';
import { RevenueBarChart } from './dashboard/RevenueBarChart';
import { PaymentMix } from './dashboard/PaymentMix';
import { TopItemsTable } from './dashboard/TopItemsTable';
import { OperationsCard } from './dashboard/OperationsCard';
import { StockAlertsCard } from './dashboard/StockAlertsCard';
import { useDashboardWorkspace, type Timeframe } from './dashboard/useDashboardWorkspace';
import { ReportsSection } from './dashboard/reports/ReportsSection';
import type { DashboardAnalyticsPayload } from './dashboard/dashboard.types';
import { businessDateString } from '@/lib/utils/business-day';

// The report shows paise so its lines add up exactly; the headline cards keep whole rupees.
const exact = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

/** The orders and kitchen sheets know Today, 7 days, 12 months and a custom range; the newer periods open as their dates. */
function sheetPeriod(t: Timeframe, d: DashboardAnalyticsPayload | null, active: { start: string; end: string } | null) {
  if (t === 'daily' || t === 'weekly' || t === 'monthly' || t === 'custom') return { timeframe: t, range: active };
  const range = d?.start_date && d?.end_date ? { start: businessDateString(new Date(d.start_date)), end: businessDateString(new Date(d.end_date)) } : null;
  return { timeframe: range ? ('custom' as const) : ('daily' as const), range };
}

export type { DashboardAnalyticsPayload };

const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });

function rangeLabel(d: DashboardAnalyticsPayload | null): string {
  if (!d?.start_date || !d?.end_date) return 'Loading period…';
  const a = day(d.start_date), b = day(d.end_date);
  return a === b ? a : `${a} – ${b}`;
}

/** The venue's numbers for one period: headline figures, sales over time, how people paid, what sold, and operations. */
export function DashboardWorkspace({ venueId, onNavigate }: { venueId?: string; onNavigate?: (tab: string) => void } = {}) {
  const w = useDashboardWorkspace(venueId);
  const { data, isLoading, formatCurrency } = w;
  const sheet = sheetPeriod(w.timeframe, data, w.activeRange);
  const multiDay = Boolean(data?.start_date && data?.end_date && Date.parse(data.end_date) - Date.parse(data.start_date) > 36 * 3_600_000);

  return (
    <div className="space-y-6 pb-20 text-neutral-900">
      <DashboardHeader
        timeframe={w.timeframe}
        setTimeframe={w.setTimeframe}
        startDate={w.startDate}
        setStartDate={w.setStartDate}
        endDate={w.endDate}
        setEndDate={w.setEndDate}
        onApplyCustomRange={() => { if (w.startDate && w.endDate) w.setActiveRange({ start: w.startDate, end: w.endDate }); }}
        rangeLabel={rangeLabel(data)}
        isRefreshing={w.isRefreshing || (isLoading && Boolean(data))}
        onOpenZReport={() => w.setIsEodModalOpen(true)}
      />

      {!data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100/60" />)}
          <div className="col-span-full h-80 animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100/60" />
        </div>
      ) : (
        <div className={`space-y-6 transition-opacity ${isLoading ? 'opacity-60' : ''}`}>
          <KpiStrip data={data} formatCurrency={formatCurrency} />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <section aria-label="Sales over time" className="rounded-2xl border border-neutral-200 bg-white p-6 xl:col-span-2">
              <div className="mb-4 flex items-baseline justify-between">
                <h3 className="font-serif text-lg text-neutral-950">Sales over time</h3>
                <span className="font-mono text-xs text-neutral-500">{formatCurrency(data.sales_overview.gross_revenue)}</span>
              </div>
              <RevenueBarChart points={Array.isArray(data.chartData) ? data.chartData : []} formatCurrency={formatCurrency} />
            </section>
            <PaymentMix breakdown={data.payment_breakdown} formatCurrency={formatCurrency} />
          </div>

          {data.reports && <ReportsSection r={data.reports} pnl={data.pnl} format={exact} periodLabel={rangeLabel(data)} multiDay={multiDay} truncated={data.truncated} />}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2"><TopItemsTable items={data.best_selling} formatCurrency={formatCurrency} /></div>
            <OperationsCard status={data.order_status} onOpenOrders={() => w.setIsOrdersSheetOpen(true)} onOpenKitchen={() => w.setIsKitchenSheetOpen(true)} />
          </div>

          <StockAlertsCard items={data.critical_items} stock={data.stock} onOpenInventory={onNavigate ? () => onNavigate('inventory') : undefined} />
        </div>
      )}

      {w.isEodModalOpen && <EodZReportModal venueId={venueId} onClose={() => w.setIsEodModalOpen(false)} />}
      {w.isOrdersSheetOpen && <OrdersListSheet timeframe={sheet.timeframe} customRange={sheet.range} venueId={venueId} onClose={() => w.setIsOrdersSheetOpen(false)} />}
      {w.isKitchenSheetOpen && <KitchenTicketsSheet timeframe={sheet.timeframe} onClose={() => w.setIsKitchenSheetOpen(false)} />}
    </div>
  );
}
