import { normalizeVenueTypes } from '@/lib/venue/venue-model';
import { readLocks } from '@/lib/services/security/protected-modules';

export interface ProfileForm {
  owner: { fullName: string; email: string; phone: string; dob: string; gender: string };
  venue: {
    businessName: string; legalName: string; registrationType: string; venueTypes: string[];
    gstNumber: string; panNumber: string; fssaiNumber: string; contactPhone: string; contactEmail: string;
    checkinTime: string; checkoutTime: string;
  };
  location: { address: string; city: string; state: string; pincode: string };
  banking: { bankName: string; accountNumber: string; ifsc: string; upiId: string };
  protectedModules: Record<string, boolean>;
}

const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));

/**
 * The form from GET /api/host/profile. Older profiles only had an "offers accommodation" switch:
 * if it is on and no stay type was chosen, Hotel is pre-selected so the rooms section stays.
 */
export function fromServer(d: any): { form: ProfileForm; preselectedStay: boolean } {
  const p = d?.profile || {}, b = d?.business || {}, l = d?.location || {};
  let types = normalizeVenueTypes(b.categories?.length ? b.categories : p.categories_handled);
  const staySet = types.some((t) => ['hotel', 'resort', 'homestay', 'hostel', 'villa'].includes(t));
  const preselectedStay = Boolean(p.offers_accommodation) && !staySet;
  if (preselectedStay) types = [...types, 'hotel'];
  return {
    preselectedStay,
    form: {
      owner: { fullName: s(p.full_name), email: s(p.email), phone: s(p.phone), dob: s(p.dob).slice(0, 10), gender: s(p.gender) || 'prefer_not_to_say' },
      venue: {
        businessName: s(b.business_name || b.name || l.branch_name), legalName: s(b.legal_name), registrationType: s(b.registration_type),
        venueTypes: types, gstNumber: s(b.gst_number), panNumber: s(b.pan_number), fssaiNumber: s(b.fssai_number),
        contactPhone: s(b.contact_phone), contactEmail: s(b.email), checkinTime: s(b.checkin_time) || '12:00', checkoutTime: s(b.checkout_time) || '11:00',
      },
      location: { address: s(l.address), city: s(l.city), state: s(l.state), pincode: s(l.pincode) },
      banking: { bankName: s(b.bank_name), accountNumber: s(b.bank_account_number), ifsc: s(b.bank_ifsc_code), upiId: s(b.upi_id) },
      protectedModules: readLocks(d?.protected_modules ?? b.protected_modules),
    },
  };
}

/** Sets one field by its dotted path ("venue.gstNumber"); "group.__all" replaces the whole group. */
export function setPath(form: ProfileForm, path: string, value: unknown): ProfileForm {
  const [group, key] = path.split('.') as [keyof ProfileForm, string];
  if (key === '__all') return { ...form, [group]: value };
  return { ...form, [group]: { ...(form[group] as Record<string, unknown>), [key]: value } };
}

export const sameForm = (a: ProfileForm | null, b: ProfileForm | null) => JSON.stringify(a) === JSON.stringify(b);
