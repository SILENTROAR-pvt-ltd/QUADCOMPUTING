import { describe, expect, it } from 'vitest';
import { normalizeWhatsapp, orderMessage, parseVendorInput, whatsappLink } from './vendor-input';

const statusOf = (fn: () => unknown) => { try { fn(); return null; } catch (e: any) { return e.status ?? -1; } };
const PNG = 'data:image/png;base64,iVBORw0KGgo=';

describe('normalizeWhatsapp', () => {
  it('adds 91 to a 10-digit Indian mobile and strips punctuation and leading zeros', () => {
    expect(normalizeWhatsapp('98765 43210')).toBe('919876543210');
    expect(normalizeWhatsapp('+91 98765-43210')).toBe('919876543210');
    expect(normalizeWhatsapp('09876543210')).toBe('919876543210');
  });

  it('keeps a full international number and refuses a short one', () => {
    expect(normalizeWhatsapp('+44 7700 900123')).toBe('447700900123');
    expect(normalizeWhatsapp('12345')).toBeNull();
  });
});

describe('parseVendorInput', () => {
  const good = { name: '  Ravi  Bike Rentals ', category: 'bike_rental', whatsapp_phone: '9876543210', qr_image: PNG, notes: ' Open 8 to 8 ' };

  it('cleans a full vendor form', () => {
    expect(parseVendorInput(good)).toEqual({
      name: 'Ravi Bike Rentals', category: 'bike_rental', whatsapp_phone: '919876543210', qr_image: PNG, notes: 'Open 8 to 8',
    });
  });

  it.each([
    ['an empty name', { name: '  ' }],
    ['an unknown category', { category: 'casino' }],
    ['a bad phone', { whatsapp_phone: '123' }],
    ['a QR that is not an image', { qr_image: 'data:text/html;base64,PHNjcmlwdD4=' }],
    ['a QR that is too large', { qr_image: `data:image/png;base64,${'A'.repeat(400_001)}` }],
    ['notes that are too long', { notes: 'x'.repeat(301) }],
  ])('refuses %s with a 400', (_label, patch) => {
    expect(statusOf(() => parseVendorInput({ ...good, ...patch }))).toBe(400);
  });

  it('takes only the sent fields on an edit, and null removes the QR', () => {
    expect(parseVendorInput({ notes: 'Call first' }, true)).toEqual({ notes: 'Call first' });
    expect(parseVendorInput({ qr_image: null }, true)).toEqual({ qr_image: null });
  });
});

describe('whatsappLink', () => {
  it('opens a chat with the message typed in', () => {
    expect(whatsappLink('919876543210', 'Hi & thanks')).toBe('https://wa.me/919876543210?text=Hi%20%26%20thanks');
  });
});

describe('orderMessage', () => {
  const order = {
    id: '4948e690-78a9-4f0b-8865-28784fd533dd', table_number: 'Room 4', customer_name: 'Asha', customer_phone: '9876543210',
    delivery_address: null, created_at: '2026-10-16T08:00:00Z',
    items: [{ name: 'Paneer Wrap', quantity: 2, notes: 'less spicy' }, { item_name: 'Masala Chai', qty: 1 }],
  };

  it('lists the venue, where to, the guest and every item with its note', () => {
    expect(orderMessage(order, 'Bombay Rasoi', 'Please deliver by 8 pm')).toBe([
      'New order from Bombay Rasoi', 'For: Room 4', 'Guest: Asha · 9876543210', '',
      '• 2 × Paneer Wrap (less spicy)', '• 1 × Masala Chai', '', 'Please deliver by 8 pm', 'Ref 4948E690',
    ].join('\n'));
  });

  it('uses the delivery address when there is one, and leaves out the placeholder guest', () => {
    const msg = orderMessage({ ...order, delivery_address: '12 MG Road', customer_name: 'Guest', customer_phone: null, table_number: 'DLV-AB12CD34' }, 'Bombay Rasoi');
    expect(msg).toContain('Deliver to: 12 MG Road');
    expect(msg).not.toContain('Guest:');
    expect(msg).not.toMatch(/\n\n\n/);
  });
});
