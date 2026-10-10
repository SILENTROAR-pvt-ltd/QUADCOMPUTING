export const categories = ['Cafe', 'Restaurant', 'Hotel', 'Rooms', 'Lounge'];

export const genderOptions = [
  ['male', 'Male'],
  ['female', 'Female'],
  ['other', 'Other'],
  ['prefer_not_to_say', 'Prefer Not to Say'],
] as const;

export const emptyBusiness = {
  businessName: '',
  gstNumber: '',
  pincode: '',
  state: '',
  city: '',
  address: '',
};

export const inputClass =
  'w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white placeholder:text-neutral-600 transition-all focus:border-white focus:outline-none focus:ring-1 focus:ring-white/30';

export const labelClass =
  'mb-2 block text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-semibold';
