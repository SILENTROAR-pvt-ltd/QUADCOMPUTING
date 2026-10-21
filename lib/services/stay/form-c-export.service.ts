/**
 * Bureau of Immigration (BoI) Form C Generator & Exporter
 * Compliance: Saraai Act 1867 & Foreigners Act 1946 (Registration of Foreigners Rules)
 * Mandate: Hoteliers must report foreign national arrival details to FRRO within 24 hours.
 */

export interface FormCEntry {
  stay_log_id: string;
  guest_name: string;
  country_of_origin: string;
  passport_number: string;
  visa_number?: string | null;
  visa_expiry_date?: string | null;
  room_number: string;
  check_in_time: string;
  check_out_time?: string | null;
  guest_phone: string;
  guest_address?: string | null;
  purpose_of_visit?: string | null;
}

/** Formats a single stay record into BoI standard Form C row */
export function formatFormCRow(entry: FormCEntry): string[] {
  return [
    entry.stay_log_id,
    entry.guest_name.trim(),
    (entry.country_of_origin || 'UNKNOWN').toUpperCase(),
    (entry.passport_number || 'N/A').toUpperCase(),
    (entry.visa_number || 'N/A').toUpperCase(),
    entry.visa_expiry_date || 'N/A',
    entry.room_number,
    entry.check_in_time,
    entry.check_out_time || 'ACTIVE_STAY',
    entry.guest_phone || 'N/A',
    entry.purpose_of_visit || 'Tourism/Leisure',
    (entry.guest_address || '').replace(/[\r\n,]/g, ' '),
  ];
}

export const FORM_C_CSV_HEADERS = [
  'Reference ID',
  'Guest Name',
  'Nationality / Country of Origin',
  'Passport Number',
  'Visa Number',
  'Visa Expiry Date',
  'Room Number',
  'Arrival Timestamp (IST)',
  'Departure Timestamp (IST)',
  'Contact Number',
  'Purpose of Visit',
  'Address',
];

/** Converts a list of foreign national stay records into official Form C CSV format */
export function exportFormCCsv(entries: FormCEntry[]): string {
  const headerLine = FORM_C_CSV_HEADERS.map((h) => `"${h}"`).join(',');
  const rowLines = entries.map((entry) =>
    formatFormCRow(entry)
      .map((val) => `"${val.replace(/"/g, '""')}"`)
      .join(',')
  );
  return [headerLine, ...rowLines].join('\r\n');
}
