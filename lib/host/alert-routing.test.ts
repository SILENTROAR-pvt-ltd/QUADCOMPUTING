import { describe, it, expect } from 'vitest';
import { alertCountsByTab, alertTarget } from './alert-routing';
import { sameTable } from './open-room-request';

describe('where a guest call belongs', () => {
  it('sends room calls to Accommodations, bills to the till, waiter and service calls to Live Tables, chef calls to the kitchen', () => {
    expect(alertTarget({ table_number: 'ROOM 204', notification_type: 'BILL' })).toMatchObject({ tab: 'accommodations', room: '204', place: 'Room 204' });
    expect(alertTarget({ table_number: 'ROOM suite1', notification_type: 'SERVICE' })).toMatchObject({ tab: 'accommodations', room: 'suite1' });
    expect(alertTarget({ table_number: 'T-03', notification_type: 'BILL' })).toMatchObject({ tab: 'billing', table: 'T-03', place: 'Table T-03' });
    expect(alertTarget({ table_number: 'T-03', notification_type: 'WAITER' })).toMatchObject({ tab: 'tables', table: 'T-03' });
    expect(alertTarget({ table_number: 'T-03', notification_type: 'SERVICE' })).toMatchObject({ tab: 'tables' });
    expect(alertTarget({ table_number: 'T-03', notification_type: 'CHEF' })).toMatchObject({ tab: 'kitchen' });
    expect(alertTarget({ table_number: null, notification_type: 'LOW_STOCK_ALERT' })).toMatchObject({ tab: 'inventory', place: 'Inventory' });
    expect(alertTarget({ table_number: null, notification_type: 'WALLET_SUSPENDED_LOW_BALANCE' })).toMatchObject({ tab: 'wallet' });
  });

  it('counts the calls waiting per workspace, and matches a table under any of its spellings', () => {
    const counts = alertCountsByTab([
      { table_number: 'ROOM 204', notification_type: 'BILL' }, { table_number: 'ROOM 205', notification_type: 'SERVICE' },
      { table_number: 'T-03', notification_type: 'WAITER' }, { table_number: 'T-04', notification_type: 'BILL' },
    ]);
    expect(counts).toEqual({ accommodations: 2, tables: 1, billing: 1 });
    expect(sameTable('T-03', 'Table 3')).toBe(true);
    expect(sameTable('3', 'T-03')).toBe(true);
    expect(sameTable('T-03', 'T-13')).toBe(false);
  });
});
