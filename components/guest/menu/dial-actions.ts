import type { DialAction } from './QuickActionsDial';

interface DialContext {
  settled: boolean;
  billReady: boolean;
  billRequested: boolean;
  hasServices: boolean;
  openProfile: () => void;
  openService: () => void;
  openTracker: () => void;
  requestBill: () => void;
  goToServices: () => void;
  openLounge: () => void;
}

/** The places a guest goes next, nearest the thumb first. The bill appears once it can be asked for, and stays as "requested". */
export function buildDialActions(c: DialContext): DialAction[] {
  const bill: DialAction[] = c.settled || (!c.billReady && !c.billRequested)
    ? []
    : [{ id: 'bill', label: c.billRequested ? 'Bill requested' : 'Request bill', onSelect: c.requestBill, done: c.billRequested }];
  return [
    { id: 'profile', label: 'My profile', onSelect: c.openProfile },
    { id: 'service', label: 'Table service', onSelect: c.openService },
    { id: 'tracker', label: 'Order tracker', onSelect: c.openTracker },
    ...bill,
    ...(c.hasServices ? [{ id: 'services' as const, label: 'Venue services', onSelect: c.goToServices }] : []),
    { id: 'lounge', label: 'Lounge', onSelect: c.openLounge },
  ];
}
