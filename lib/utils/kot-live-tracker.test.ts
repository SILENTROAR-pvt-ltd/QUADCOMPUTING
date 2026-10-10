import { describe, it, expect } from 'vitest';
import {
  addKitchenTicket,
  updateKitchenTicketStatus,
  findKitchenTicketForTableOrOrder,
  saveActiveOrder,
  findActiveOrder,
  InMemKitchenTicket,
  ActiveOrderRecord,
} from '../store/active-order-store';
import { normalizeTableIdentifier } from '../../components/guest/menu/hooks/order-totals.util';

describe('KOT Live Tracker & Chef Status Sync', () => {
  const businessId = 'test-biz-kot';

  it('normalizes add-on table identifiers to match base table', () => {
    expect(normalizeTableIdentifier('T-02')).toBe('02');
    expect(normalizeTableIdentifier('Table T-02')).toBe('02');
    expect(normalizeTableIdentifier('T-02 (Add-on KOT)')).toBe('02');
    expect(normalizeTableIdentifier('Table 02 (Add-on KOT)')).toBe('02');
    expect(normalizeTableIdentifier('T-01')).not.toBe(normalizeTableIdentifier('T-02 (Add-on KOT)'));
  });

  it('correctly tracks and updates KOT ticket status and syncs active order', () => {
    const ticketId = 'kot_test_sync_1';
    const orderId = 'ord_sync_1';

    const activeOrder: ActiveOrderRecord = {
      id: orderId,
      business_id: businessId,
      table_number: 'T-02',
      status: 'pending',
      subtotal: 500,
      tax_amount: 25,
      grand_total: 525,
      total_amount: 525,
      items: [{ id: '1', name: 'Toast', quantity: 1, price: 500 }],
      raw_items: [{ order_id: orderId, item_name: 'Toast', price: 500, quantity: 1, kot_status: 'pending' }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveActiveOrder(activeOrder);

    const ticket: InMemKitchenTicket = {
      id: ticketId,
      business_id: businessId,
      order_id: orderId,
      ticket_number: 'KOT-8899-ADD',
      table_or_room: 'T-02 (Add-on KOT)',
      items: [{ name: 'Toast', qty: 1 }],
      status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    addKitchenTicket(ticket);

    // Initial check: find ticket by table number
    const foundInitial = findKitchenTicketForTableOrOrder(businessId, 'T-02');
    expect(foundInitial).not.toBeNull();
    expect(foundInitial?.status).toBe('PENDING');

    // Chef starts cooking: status becomes PREPARING and active order updates to preparing
    updateKitchenTicketStatus(ticketId, 'PREPARING');
    const foundPreparing = findKitchenTicketForTableOrOrder(businessId, 'T-02');
    expect(foundPreparing?.status).toBe('PREPARING');
    const orderPreparing = findActiveOrder(businessId, 'T-02');
    expect(orderPreparing?.status).toBe('preparing');

    // Chef marks dish ready: status becomes READY and active order updates to ready
    updateKitchenTicketStatus(ticketId, 'READY');
    const foundReady = findKitchenTicketForTableOrOrder(businessId, 'T-02');
    expect(foundReady?.status).toBe('READY');
    const orderReady = findActiveOrder(businessId, 'T-02');
    expect(orderReady?.status).toBe('ready');

    // Chef marks dish served: status becomes SERVED and active order updates to served
    updateKitchenTicketStatus(ticketId, 'SERVED');
    const foundServed = findKitchenTicketForTableOrOrder(businessId, 'T-02');
    expect(foundServed?.status).toBe('SERVED');
    const orderServed = findActiveOrder(businessId, 'T-02');
    expect(orderServed?.status).toBe('served');
  });

  it('correctly determines LiveOrderTracker stage progression strictly based on backend order & KOT status', () => {
    const getStage = (kotStatus?: string | null, orderStatus?: string | null) => {
      const normKot = (kotStatus || '').toUpperCase();
      const normOrd = (orderStatus || '').toUpperCase();
      const isStage3 = ['READY', 'SERVED', 'COMPLETED', 'DELIVERED'].includes(normKot) ||
                       ['READY', 'SERVED', 'COMPLETED', 'DELIVERED'].includes(normOrd);
      const isStage2 = !isStage3 && (
        ['PREPARING', 'PROCESSING', 'STARTED', 'COOKING', 'IN_PROGRESS'].includes(normKot) ||
        ['PREPARING', 'PROCESSING', 'STARTED', 'COOKING', 'IN_PROGRESS'].includes(normOrd)
      );
      return isStage3 ? 3 : isStage2 ? 2 : 1;
    };

    // Step 1: Order Placed
    expect(getStage('PENDING')).toBe(1);
    expect(getStage(null, 'placed')).toBe(1);
    expect(getStage(null, 'pending')).toBe(1);
    expect(getStage(null, null)).toBe(1);

    // Step 2: Preparing by Chef (only when preparing/processing/started)
    expect(getStage('PREPARING')).toBe(2);
    expect(getStage('STARTED')).toBe(2);
    expect(getStage(null, 'preparing')).toBe(2);
    expect(getStage(null, 'processing')).toBe(2);

    // Step 3: Ready / Served (only when ready/completed/served)
    expect(getStage('READY')).toBe(3);
    expect(getStage('SERVED')).toBe(3);
    expect(getStage(null, 'ready')).toBe(3);
    expect(getStage(null, 'completed')).toBe(3);
    expect(getStage(null, 'served')).toBe(3);
  });
});
