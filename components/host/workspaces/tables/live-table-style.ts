// One look for each table state, used by the tile, the legend and the control panel.
import type { TableVisualState } from '@/lib/utils/live-table-state';

export interface TableStateStyle {
  label: string;
  /** Tile background and border. */
  tile: string;
  /** Small status chip. */
  chip: string;
  /** Dot in the chip. */
  dot: string;
  /** Pulse on the dot, for states that need attention. */
  pulse: boolean;
}

export const TABLE_STATE_STYLE: Record<TableVisualState, TableStateStyle> = {
  live: {
    label: 'Live order',
    tile: 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200',
    chip: 'bg-emerald-600 text-white',
    dot: 'bg-white',
    pulse: true,
  },
  bill_requested: {
    label: 'Bill requested',
    tile: 'border-sky-400 bg-sky-50 ring-1 ring-sky-200',
    chip: 'bg-sky-600 text-white',
    dot: 'bg-white',
    pulse: true,
  },
  occupied: {
    label: 'Occupied',
    tile: 'border-amber-300 bg-amber-50',
    chip: 'bg-amber-200 text-amber-950',
    dot: 'bg-amber-600',
    pulse: false,
  },
  settled: {
    label: 'Settled',
    tile: 'border-neutral-300 bg-neutral-100',
    chip: 'bg-neutral-800 text-white',
    dot: 'bg-emerald-400',
    pulse: false,
  },
  vacant: {
    label: 'Vacant',
    tile: 'border-neutral-200 bg-white',
    chip: 'bg-neutral-100 text-neutral-600',
    dot: 'bg-neutral-300',
    pulse: false,
  },
};

export const TABLE_STATE_ORDER: TableVisualState[] = ['live', 'bill_requested', 'occupied', 'settled', 'vacant'];
