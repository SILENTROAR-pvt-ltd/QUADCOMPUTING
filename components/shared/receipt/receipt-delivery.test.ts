import { describe, it, expect } from 'vitest';
import { deliveryNote } from './ReceiptModalActions';
import type { InvoiceData } from '@/lib/utils/receipt-adapter';

const inv = (extra: Partial<InvoiceData>): InvoiceData => ({ items: [], subtotal: 0, grandTotal: 0, ...extra });

describe('where a saved bill goes', () => {
  it('names the guest when their Vibers Connect handle is linked', () => {
    const note = deliveryNote(inv({ table_id: 't', table_number: 'T-05', guest_handle: '@babaaps' }));
    expect(note?.title).toBe('Sent to @babaaps on Vibers Connect');
  });

  it('adds the @ when the handle comes without one', () => {
    expect(deliveryNote(inv({ table_id: 't', table_number: 'T-05', guest_handle: 'babaaps' }))?.title).toContain('@babaaps');
  });

  it('tells a table with no linked guest that everyone there sees it on Vibers Connect', () => {
    expect(deliveryNote(inv({ table_id: 't', table_number: 'T-05' }))?.title).toBe('Sent to the guests on Vibers Connect');
  });

  it('has nothing to send for a counter bill', () => {
    expect(deliveryNote(inv({ table_number: 'Takeaway / Counter' }))).toBeNull();
    expect(deliveryNote(inv({}))).toBeNull();
  });
});
