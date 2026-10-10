'use client';

import { EodZReportModal } from '@/components/host/modals/EodZReportModal';
import { OrdersListSheet } from '@/components/host/modals/OrdersListSheet';
import { KitchenTicketsSheet } from '@/components/host/modals/KitchenTicketsSheet';
import { AddPromotionModal } from '@/components/host/modals/AddPromotionModal';
import { DashboardHeader } from './dashboard/DashboardHeader';
import { KpiStrip } from './dashboard/KpiStrip';
import { RevenueBarChart } from './dashboard/RevenueBarChart';
import { PaymentMix } from './dashboard/PaymentMix';
import { TopItemsTable } from './dashboard/TopItemsTable';
import { OperationsCard } from './dashboard/OperationsCard';
import { PromotionsCard } from './dashboard/PromotionsCard';
import { StockAlertsCard } from './dashboard/StockAlertsCard';
import { useDashboardWorkspace } from './dashboard/useDashboardWorkspace';
import type { DashboardAnalyticsPayload } from './dashboard/dashboard.types';

export type { DashboardAnalyticsPayload };

const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });

function rangeLabel(d: DashboardAnalyticsPayload | null): string {
  if (!d?.start_date || !d?.end_date) return 'Loading period…';
  const a = day(d.start_date), b = day(d.end_date);
  return a === b ? a : `${a} – ${b}`;
}

/** The venue's numbers for one period: headline figures, sales over time, how people paid, what sold, and operations. */
export function DashboardWorkspace({ venueId }: { venueId?: string } = {}) {
  const w = useDashboardWorkspace(venueId);
  const { data, isLoading, formatCurrency } = w;

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

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2"><TopItemsTable items={data.best_selling} formatCurrency={formatCurrency} /></div>
            <OperationsCard status={data.order_status} onOpenOrders={() => w.setIsOrdersSheetOpen(true)} onOpenKitchen={() => w.setIsKitchenSheetOpen(true)} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PromotionsCard promotions={data.active_promotions} formatCurrency={formatCurrency} onAdd={() => w.setIsAddPromoOpen(true)} onDelete={w.handleDeletePromotion} deletingId={w.isDeletingPromo} />
            <StockAlertsCard items={data.critical_items} />
          </div>
        </div>
      )}

      {w.isEodModalOpen && <EodZReportModal venueId={venueId} onClose={() => w.setIsEodModalOpen(false)} />}
      {w.isOrdersSheetOpen && <OrdersListSheet timeframe={w.timeframe} customRange={w.activeRange} venueId={venueId} onClose={() => w.setIsOrdersSheetOpen(false)} />}
      {w.isKitchenSheetOpen && <KitchenTicketsSheet timeframe={w.timeframe} onClose={() => w.setIsKitchenSheetOpen(false)} />}
      {w.isAddPromoOpen && <AddPromotionModal onClose={() => w.setIsAddPromoOpen(false)} onSuccess={() => { w.setIsAddPromoOpen(false); void w.loadData(true); }} />}
    </div>
  );
}
