'use client';

import React, { Suspense } from 'react';
import { ControlCenterHeader, type ControlCenterTab } from '@/components/host/ControlCenterHeader';
import { KpiStrip } from '@/components/host/workspaces/dashboard/KpiStrip';
import { TopItemsTable } from '@/components/host/workspaces/dashboard/TopItemsTable';
import { StockAlertsCard } from '@/components/host/workspaces/dashboard/StockAlertsCard';
import { SalesSummaryCard } from '@/components/host/workspaces/dashboard/reports/SalesSummaryCard';
import { DonutChart } from '@/components/host/workspaces/dashboard/reports/DonutChart';
import { CategoryBars } from '@/components/host/workspaces/dashboard/reports/CategoryBars';
import { GuestsCard } from '@/components/host/workspaces/dashboard/reports/GuestsCard';
import { ProfitLossCard } from '@/components/host/workspaces/dashboard/reports/ProfitLossCard';
import { DailyBars } from '@/components/host/payments/DailyBars';
import { EarnShareDonut } from '@/components/host/payments/EarnShareDonut';
import { PaymentMethodSplit } from '@/components/host/payments/PaymentMethodSplit';
import { SERIES, compactRupees } from '@/components/host/payments/chart-tokens';
import { EarnDueBoxes } from '@/components/host/wallet/EarnDueBoxes';
import { DaySlipCard } from '@/components/host/wallet/slips/DaySlipCard';
import { DeliveryOrderCard } from '@/components/host/workspaces/delivery/DeliveryOrderCard';
import { VendorCard } from '@/components/host/workspaces/vendors/VendorCard';
import { formatRupees } from '@/components/host/wallet/money';
import { analytics, dues, invoices, pnl, reports } from '@/lib/showcase/demo-screens';
import { deliveries, vendors } from '@/lib/showcase/demo-extras';
import { DEMO_VENUE } from '@/lib/showcase/demo-orders';
import { TableZonesScreen } from './TableScreens';

const CARD = 'rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6';
const CHANNEL_COLOR = { dine_in: '#2a78d6', delivery: '#eb6834', counter: '#1baf7a' } as const;
const noop = () => undefined;
const hours = reports.by_hour.slice(9, 23).map((h) => ({ key: String(h.hour), label: h.label, value: h.sales }));

/** The real control-centre header, on the given tab. */
function Chrome({ tab, children }: { tab: ControlCenterTab; children: React.ReactNode }) {
  return (
    <div className="bg-[#faf9f6]">
      <Suspense><ControlCenterHeader activeTab={tab} onTabChange={noop} venueName={DEMO_VENUE.name} venueId={DEMO_VENUE.id} /></Suspense>
      <div className="mx-auto max-w-7xl space-y-4 px-8 py-6">{children}</div>
    </div>
  );
}

const Overview = () => (
  <Chrome tab="dashboard">
    <KpiStrip data={analytics as any} formatCurrency={formatRupees} />
    <div className="grid grid-cols-3 gap-4">
      <SalesSummaryCard s={reports.summary} format={formatRupees} />
      <div className={`${CARD} col-span-2`}>
        <DailyBars title="Sales by hour" format={formatRupees} axisFormat={compactRupees} color="#2a78d6" data={hours}
          subtitle={`Busiest: ${reports.peak_hour?.label} · ${formatRupees(reports.peak_hour?.sales ?? 0)} from ${reports.peak_hour?.bills} bills`} />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-4">
      <div className={CARD}>
        <h3 className="font-serif text-lg text-neutral-950">Where sales came from</h3>
        <p className="mb-4 text-[11px] text-neutral-500">Total collected by channel</p>
        <DonutChart format={formatRupees} centerLabel="collected"
          slices={reports.channels.map((c) => ({ id: c.id, label: c.label, value: c.sales, color: CHANNEL_COLOR[c.id], detail: `${c.bills} bills` }))} />
      </div>
      <CategoryBars categories={reports.categories} format={formatRupees} />
      <GuestsCard g={reports.guests} format={formatRupees} />
    </div>
  </Chrome>
);

const Dues = () => (
  <Chrome tab="payments">
    <EarnDueBoxes summary={dues.summary} invoices={invoices} loaded onSettle={noop} />
    <div className="grid grid-cols-3 gap-4">
      <div className={CARD}><EarnShareDonut revenue={dues.summary.revenue} fees={dues.summary.feesCharged} loaded /></div>
      <div className={`${CARD} col-span-2`}>
        <DailyBars title="You earn per day" subtitle="Last 14 billing days · from settled bills" data={dues.revenueBars} color={SERIES.youEarn} format={formatRupees} axisFormat={compactRupees} />
      </div>
      <div className={`${CARD} col-span-2`}>
        <DailyBars title="We earn per day" subtitle="Last 14 billing days · ₹3 a bill, nothing else" data={dues.feeBars} color={SERIES.weEarn} format={formatRupees} axisFormat={compactRupees} />
      </div>
      <div className={CARD}><PaymentMethodSplit methods={dues.methods} rangeLabel="Last 14 billing days" /></div>
    </div>
  </Chrome>
);

const pad = (node: React.ReactNode) => <div className="bg-[#faf9f6] p-6">{node}</div>;

/** Each host screenshot, by its id. */
export const HOST_SCREENS: Record<string, () => React.ReactElement> = {
  'table-zones': TableZonesScreen,
  overview: Overview,
  dues: Dues,
  pnl: () => pad(<ProfitLossCard p={pnl} format={formatRupees} />),
  'items-stock': () => pad(
    <div className="grid grid-cols-2 gap-4">
      <TopItemsTable items={analytics.best_selling} formatCurrency={formatRupees} />
      <StockAlertsCard items={analytics.critical_items} stock={analytics.stock} onOpenInventory={noop} />
    </div>,
  ),
  slip: () => pad(<DaySlipCard slip={{ ...dues.slip, rows: dues.slip.rows.slice(0, 7) }} isToday defaultOpen />),
  delivery: () => pad(<div className="grid grid-cols-3 gap-4">{deliveries.map((o) => <DeliveryOrderCard key={o.id} order={o} busy={false} onAdvance={noop} onMarkPaid={noop} />)}</div>),
  vendors: () => pad(<div className="grid grid-cols-3 gap-4">{vendors.map((v) => <VendorCard key={v.id} vendor={v} onEdit={noop} onShare={noop} onRemove={async () => undefined} />)}</div>),
  'dues-phone': () => (
    <div className="min-h-screen space-y-3 bg-[#faf9f6] p-4">
      <EarnDueBoxes summary={dues.summary} invoices={invoices} loaded onSettle={noop} />
      <div className={CARD}><EarnShareDonut revenue={dues.summary.revenue} fees={dues.summary.feesCharged} loaded /></div>
      <div className={CARD}><PaymentMethodSplit methods={dues.methods} rangeLabel="Last 14 billing days" /></div>
    </div>
  ),
};
