import { describe, it, expect } from 'vitest';
import { exportFormCCsv, formatFormCRow, FORM_C_CSV_HEADERS, type FormCEntry } from './form-c-export.service';

describe('Form C Bureau of Immigration Exporter', () => {
  const sampleEntry: FormCEntry = {
    stay_log_id: '11111111-2222-3333-4444-555555555555',
    guest_name: 'John Doe',
    country_of_origin: 'United Kingdom',
    passport_number: 'uk12345678',
    visa_number: 'ind987654',
    visa_expiry_date: '2027-05-15',
    room_number: '204',
    check_in_time: '2026-10-21T10:00:00.000Z',
    check_out_time: null,
    guest_phone: '9876543210',
    guest_address: 'London, Baker Street 221B',
    purpose_of_visit: 'Business',
  };

  it('formats Form C row with normalized uppercase passport and nationality', () => {
    const row = formatFormCRow(sampleEntry);
    expect(row[1]).toBe('John Doe');
    expect(row[2]).toBe('UNITED KINGDOM');
    expect(row[3]).toBe('UK12345678');
    expect(row[4]).toBe('IND987654');
    expect(row[6]).toBe('204');
    expect(row[8]).toBe('ACTIVE_STAY');
  });

  it('generates compliant CSV with correct headers and escaping', () => {
    const csv = exportFormCCsv([sampleEntry]);
    expect(csv).toContain(FORM_C_CSV_HEADERS[0]);
    expect(csv).toContain('UK12345678');
    expect(csv).toContain('UNITED KINGDOM');
    expect(csv.split('\r\n')).toHaveLength(2); // Header + 1 record
  });
});
