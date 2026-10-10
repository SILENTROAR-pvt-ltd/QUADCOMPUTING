import { describe, it, expect } from 'vitest';
import { getTicketTimings, formatTimeOnly, KitchenTicket } from './kitchen';

describe('Kitchen KOT - Timing & Delivery Tracking', () => {
  it('formats time in 12-hour format cleanly', () => {
    const d = new Date('2026-09-23T10:30:00Z');
    const formatted = formatTimeOnly(d);
    expect(formatted).toBeTruthy();
    expect(formatTimeOnly(null)).toBeNull();
  });

  it('calculates full turnaround timeline for delivered tickets', () => {
    const received = new Date('2026-09-23T10:00:00.000Z');
    const started = new Date('2026-09-23T10:04:00.000Z'); // 4m after
    const ready = new Date('2026-09-23T10:14:00.000Z');   // 10m prep
    const delivered = new Date('2026-09-23T10:18:00.000Z'); // 4m delivery

    const ticket: KitchenTicket = {
      id: 'test-1',
      ticket_number: 'KOT-1001',
      table_or_room: 'Room 101',
      status: 'SERVED',
      created_at: received.toISOString(),
      updated_at: delivered.toISOString(),
      items: [
        {
          name: 'French Fries',
          qty: 2,
          started_at: started.toISOString(),
          ready_at: ready.toISOString(),
          delivered_at: delivered.toISOString(),
        }
      ]
    };

    const timings = getTicketTimings(ticket);

    expect(timings.prepDurationMin).toBe(10);
    expect(timings.deliveryDurationMin).toBe(4);
    expect(timings.totalDurationMin).toBe(18); // 10:00 to 10:18
    expect(timings.formattedReceived).toBeTruthy();
    expect(timings.formattedStarted).toBeTruthy();
    expect(timings.formattedReady).toBeTruthy();
    expect(timings.formattedDelivered).toBeTruthy();
  });

  it('calculates live duration for currently preparing ticket', () => {
    const received = new Date('2026-09-23T10:00:00.000Z');
    const started = new Date('2026-09-23T10:03:00.000Z');
    const simulatedNow = new Date('2026-09-23T10:11:00.000Z').getTime();

    const ticket: KitchenTicket = {
      id: 'test-2',
      ticket_number: 'KOT-1002',
      table_or_room: 'Table T-02',
      status: 'PREPARING',
      created_at: received.toISOString(),
      items: [
        {
          name: 'Margherita Pizza',
          qty: 1,
          started_at: started.toISOString(),
        }
      ]
    };

    const timings = getTicketTimings(ticket, simulatedNow);

    expect(timings.prepDurationMin).toBe(8); // 10:03 to 10:11
    expect(timings.deliveryDurationMin).toBeNull();
    expect(timings.totalDurationMin).toBe(11); // 10:00 to 10:11
  });

  it('gracefully handles tickets with legacy schema using updated_at as delivery fallback', () => {
    const received = new Date('2026-09-23T10:00:00.000Z');
    const updated = new Date('2026-09-23T10:15:00.000Z');

    const legacyTicket: KitchenTicket = {
      id: 'legacy-1',
      ticket_number: 'KOT-9999',
      table_or_room: 'Table T-04',
      status: 'SERVED',
      created_at: received.toISOString(),
      updated_at: updated.toISOString(),
      items: [{ name: 'Cold Coffee', qty: 1 }]
    };

    const timings = getTicketTimings(legacyTicket);

    expect(timings.totalDurationMin).toBe(15);
    expect(timings.formattedDelivered).toBeTruthy();
  });
});
