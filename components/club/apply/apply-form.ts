// The application form's state and the checks each step runs before moving on.
export interface ApplyForm {
  dob: string;
  city: string;
  state: string;
  country: string;
  account_type: 'viber' | 'business';
  business_name: string;
  categories: string[];
  phone: string;
  phone_verified: boolean;
  display_name: string;
  viber_id: string;
  alias: string;
  alias_masked: boolean;
  vibe_line: string;
  legacy_pin: string;
}

export const EMPTY_FORM: ApplyForm = {
  dob: '', city: '', state: '', country: 'India', account_type: 'viber', business_name: '', categories: [], phone: '', phone_verified: false,
  display_name: '', viber_id: '', alias: '', alias_masked: false, vibe_line: '', legacy_pin: '',
};

export const STEPS = ['About you', 'Phone', 'Identity'] as const;

export function stepError(step: number, f: ApplyForm, cutoff: string): string | null {
  if (step === 0) {
    if (!f.dob) return 'Enter your date of birth.';
    if (f.dob > cutoff) return 'Vibers Club is for people aged 18 and over.';
    if (!f.city.trim() || !f.state.trim() || !f.country.trim()) return 'Choose your city, state and country.';
    if (f.account_type === 'business' && !f.business_name.trim()) return 'Enter your business name.';
    if (f.account_type === 'business' && f.categories.length === 0) return 'Choose at least one category.';
  }
  if (step === 1 && !f.phone_verified) return 'Verify your mobile number to continue.';
  if (step === 2) {
    if (!f.display_name.trim()) return 'Enter your name.';
    if (!/^@?[a-z0-9_]{2,30}$/i.test(f.viber_id.trim())) return 'Choose a Viber ID of 2–30 letters, numbers or underscores.';
    if (f.alias_masked && !f.alias.trim()) return 'Add a club name to mask your identity with.';
  }
  return null;
}
