'use client';

import { TopupQueue } from '@/components/admin/payments/TopupQueue';
import { FeeLedger, FinanceTiles, IncomeChart, type FinanceAnswer } from '@/components/admin/payments/FinancePanels';
import { ErrorNote } from '@/components/admin/ui/Panel';
import { useAdminData } from '@/components/admin/ui/useAdminData';

/** /admin/payments: income, dues and balances held, then the payment approval queue. */
export default function AdminPayments() {
  const { data, error } = useAdminData<FinanceAnswer>('/api/admin/finance', 60_000);
  return (
    <div className="space-y-5">
      {error && <ErrorNote>{error}</ErrorNote>}
      {data ? <FinanceTiles f={data} /> : <div className="h-28 animate-pulse rounded-2xl bg-white" />}
      <TopupQueue />
      {data && (
        <div className="grid gap-5 xl:grid-cols-2">
          <IncomeChart months={data.months} />
          <FeeLedger venues={data.venues} />
        </div>
      )}
    </div>
  );
}
