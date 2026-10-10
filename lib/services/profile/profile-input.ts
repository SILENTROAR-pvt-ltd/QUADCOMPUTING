import { businessModel, hasStays, normalizeVenueTypes } from '@/lib/venue/venue-model';
import { cleanLocks } from '@/lib/services/security/protected-modules';
import { REGISTRATION_TYPES, RULES, tidy, type RuleName } from './profile-rules';

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string; field?: string };
const text = (v: unknown, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export interface ProfileInput {
  owner: { full_name: string; email: string | null; phone: string | null; dob: string | null; gender: string };
  venue: Record<string, unknown>;
  location: { address: string | null; city: string | null; state: string | null; pincode: string | null };
  venueTypes: string[];
  offersAccommodation: boolean;
}

/** Validates the profile form; every field error names its field so the form can point at it. */
export function parseProfile(b: any): Parsed<ProfileInput> {
  const o = b?.owner || {}, v = b?.venue || {}, l = b?.location || {}, k = b?.banking || {};
  const check = (kind: RuleName, raw: unknown): { error: string } | { value: string | null } => {
    const val = tidy(kind, raw);
    return val && !RULES[kind].re.test(val) ? { error: RULES[kind].msg } : { value: val || null };
  };

  const fullName = text(o.fullName, 80);
  if (fullName.length < 2) return { ok: false, error: 'Enter your name.', field: 'owner.fullName' };
  const businessName = text(v.businessName, 80);
  if (businessName.length < 2) return { ok: false, error: 'Enter the venue name guests see on bills.', field: 'venue.businessName' };
  const venueTypes = normalizeVenueTypes(v.venueTypes);
  if (venueTypes.length === 0) return { ok: false, error: 'Choose what your venue is: a café, a homestay, or both.', field: 'venue.venueTypes' };
  const reg = String(v.registrationType || '');
  if (reg && !REGISTRATION_TYPES.some((r) => r.id === reg)) return { ok: false, error: 'Choose a registration type.', field: 'venue.registrationType' };

  const fields: Array<[string, RuleName, unknown]> = [
    ['owner.email', 'email', o.email], ['owner.phone', 'phone', o.phone], ['venue.contactPhone', 'phone', v.contactPhone],
    ['venue.contactEmail', 'email', v.contactEmail], ['venue.gstNumber', 'gst', v.gstNumber], ['venue.panNumber', 'pan', v.panNumber],
    ['venue.fssaiNumber', 'fssai', v.fssaiNumber], ['venue.checkinTime', 'time', v.checkinTime], ['venue.checkoutTime', 'time', v.checkoutTime],
    ['location.pincode', 'pincode', l.pincode], ['banking.ifsc', 'ifsc', k.ifsc], ['banking.accountNumber', 'account', k.accountNumber], ['banking.upiId', 'upi', k.upiId],
  ];
  const vals: Record<string, string | null> = {};
  for (const [field, kind, raw] of fields) {
    const r = check(kind, raw);
    if ('error' in r) return { ok: false, error: r.error, field };
    vals[field] = r.value;
  }
  if ((vals['banking.accountNumber'] && !vals['banking.ifsc']) || (vals['banking.ifsc'] && !vals['banking.accountNumber'])) {
    return { ok: false, error: 'Enter both the account number and IFSC, or neither.', field: 'banking.ifsc' };
  }
  const dob = /^\d{4}-\d{2}-\d{2}$/.test(String(o.dob || '')) ? String(o.dob) : null;
  const stays = hasStays(businessModel(venueTypes));

  return {
    ok: true,
    value: {
      owner: { full_name: fullName, email: vals['owner.email'], phone: vals['owner.phone'], dob,
        gender: ['male', 'female', 'other'].includes(o.gender) ? o.gender : 'prefer_not_to_say' },
      venue: {
        business_name: businessName, name: businessName, legal_name: text(v.legalName, 120) || null, registration_type: reg || null,
        categories: venueTypes, gst_number: vals['venue.gstNumber'], pan_number: vals['venue.panNumber'], fssai_number: vals['venue.fssaiNumber'],
        contact_phone: vals['venue.contactPhone'], email: vals['venue.contactEmail'],
        checkin_time: stays ? vals['venue.checkinTime'] : null, checkout_time: stays ? vals['venue.checkoutTime'] : null,
        bank_name: text(k.bankName, 80) || null, bank_account_number: vals['banking.accountNumber'], bank_ifsc_code: vals['banking.ifsc'],
        upi_id: vals['banking.upiId'], protected_modules: JSON.stringify(cleanLocks(b?.protectedModules)),
      },
      location: { address: text(l.address, 240) || null, city: text(l.city, 80) || null, state: text(l.state, 60) || null, pincode: vals['location.pincode'] },
      venueTypes,
      offersAccommodation: stays,
    },
  };
}
