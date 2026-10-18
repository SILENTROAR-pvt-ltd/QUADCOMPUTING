'use client';

import React from 'react';
import { TableManagementForms } from '@/components/host/workspaces/billing/components/TableManagementForms';
import { TableManagementCard } from '@/components/host/workspaces/billing/components/TableManagementCard';
import { TableZoneSection } from '@/components/host/workspaces/billing/components/TableZoneSection';
import type { RestaurantTable } from '@/components/host/workspaces/billing/hooks/useTableManagement';
import { groupByZone, zoneNames } from '@/lib/services/table/table-zones';

const mk = (n: number, zone: string | null, status: RestaurantTable['status'] = 'VACANT'): RestaurantTable => ({
  id: `t${n}`, table_number: `T-${String(n).padStart(2, '0')}`, seating_capacity: n % 3 === 0 ? 6 : 4, status, is_active: true, zone,
});
const TABLES: RestaurantTable[] = [
  mk(1, 'Ground floor'), mk(2, 'Ground floor', 'OCCUPIED'), mk(3, 'Ground floor'), mk(4, 'First floor'), mk(5, 'First floor', 'RESERVED'),
  mk(6, 'First floor'), mk(7, 'Riverside'), mk(8, 'Riverside'), mk(9, null),
];
const noop = async () => true;

/** The Table Management list with areas, drawn from the real components with fictional tables (no database). */
export function TableZonesScreen() {
  const zones = zoneNames(TABLES);
  return (
    <div className="mx-auto max-w-2xl space-y-6 bg-white p-8">
      <TableManagementForms isSaving={false} zones={zones} existingNumbers={TABLES.map((t) => t.table_number)} onAddSingle={noop} onBulkGenerate={noop} />
      <div className="space-y-5">
        {groupByZone(TABLES).map((g) => (
          <TableZoneSection key={g.zone ?? 'none'} zone={g.zone} count={g.tables.length} showHeading onRename={noop}>
            {g.tables.map((t) => <TableManagementCard key={t.id} table={t} zones={zones} onUpdateTable={noop} onDelete={() => undefined} onUpdateStatus={() => undefined} />)}
          </TableZoneSection>
        ))}
      </div>
    </div>
  );
}
