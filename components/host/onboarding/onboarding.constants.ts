export const genderOptions = [
  ['male', 'Male'],
  ['female', 'Female'],
  ['other', 'Other'],
  ['prefer_not_to_say', 'Prefer not to say'],
] as const;

export const emptyBusiness = {
  businessName: '',
  gstNumber: '',
  pincode: '',
  state: '',
  city: '',
  address: '',
};

export const STEPS = [
  { label: 'About you', hint: 'Who runs the venue' },
  { label: 'Your venue', hint: 'What you run, and where' },
  { label: 'Review', hint: 'Check and create' },
] as const;
