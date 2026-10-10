// Formats of Indian business identifiers and the choices the profile form offers.

export const REGISTRATION_TYPES = [
  { id: 'pvt', label: 'Private Limited Company' },
  { id: 'public', label: 'Public Limited Company' },
  { id: 'opc', label: 'One Person Company (OPC)' },
  { id: 'llp', label: 'Limited Liability Partnership (LLP)' },
  { id: 'partner', label: 'Partnership firm' },
  { id: 'prop', label: 'Sole proprietorship' },
  { id: 'huf', label: 'Hindu Undivided Family (HUF)' },
  { id: 'trust', label: 'Trust / society' },
  { id: 'unregistered', label: 'Not registered yet' },
] as const;

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

export const RULES = {
  gst: { re: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, msg: 'GSTIN is 15 characters, like 02AABCB1234C1Z5.' },
  pan: { re: /^[A-Z]{5}[0-9]{4}[A-Z]$/, msg: 'PAN is 10 characters, like ABCDE1234F.' },
  fssai: { re: /^\d{14}$/, msg: 'FSSAI licence number is 14 digits.' },
  ifsc: { re: /^[A-Z]{4}0[A-Z0-9]{6}$/, msg: 'IFSC is 11 characters, like HDFC0001234.' },
  account: { re: /^\d{9,18}$/, msg: 'Account number is 9 to 18 digits.' },
  upi: { re: /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/, msg: 'UPI ID looks like name@bank.' },
  phone: { re: /^[6-9]\d{9}$/, msg: 'Enter a 10-digit mobile number.' },
  pincode: { re: /^[1-9]\d{5}$/, msg: 'PIN code is 6 digits.' },
  email: { re: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, msg: 'Enter a valid email address.' },
  time: { re: /^([01]\d|2[0-3]):[0-5]\d$/, msg: 'Use a time like 12:00.' },
} as const;

export type RuleName = keyof typeof RULES;

/** Tidies a value for its kind: identifiers upper-case without spaces, phones digits only. */
export function tidy(kind: RuleName, raw: unknown): string {
  const v = typeof raw === 'string' ? raw.trim() : '';
  if (['gst', 'pan', 'ifsc'].includes(kind)) return v.toUpperCase().replace(/\s/g, '');
  if (['fssai', 'account', 'pincode'].includes(kind)) return v.replace(/\s/g, '');
  if (kind === 'phone') return v.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
  if (kind === 'upi' || kind === 'email') return v.toLowerCase();
  return v;
}
