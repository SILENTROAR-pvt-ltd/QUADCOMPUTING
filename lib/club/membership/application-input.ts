// Pure validation of a Club application. No I/O, so every rule is unit-tested directly.
import { ageOn, checkAlias, cleanText, generationOf, MIN_AGE } from '../identity/identity-rules';
import { containsProfanity } from '../identity/profanity';
import { normalizePhoneE164 } from '../otp/otp.service';
import type { AccountType, Generation } from '../types';

export interface ApplicationInput {
  dob: string;
  generation: Generation;
  city: string;
  state: string;
  country: string;
  accountType: AccountType;
  businessName: string | null;
  categorySlugs: string[];
  phone: string;
  displayName: string;
  rawViberId: unknown;
  alias: string | null;
  aliasMasked: boolean;
  vibeLine: string | null;
  campaign: string | null;
  legacyPin: unknown;
}

type Parsed = { ok: true; input: ApplicationInput } | { ok: false; status: number; error: string; code?: string };
const no = (error: string, status = 400, code?: string): Parsed => ({ ok: false, status, error, code });

export function parseApplication(body: Record<string, any>, now: Date = new Date()): Parsed {
  const dob = String(body.dob || '');
  const age = ageOn(dob, now);
  if (age == null) return no('Enter your date of birth.');
  if (age < MIN_AGE) return no('Vibers Club is for people aged 18 and over.', 403, 'under_18');

  const city = cleanText(body.city, 60), state = cleanText(body.state, 60), country = cleanText(body.country, 60);
  if (!city || !state || !country) return no('Choose your city, state and country.');

  const accountType: AccountType = body.account_type === 'business' ? 'business' : 'viber';
  const businessName = accountType === 'business' ? cleanText(body.business_name, 120) : null;
  const categorySlugs = Array.isArray(body.categories)
    ? Array.from(new Set(body.categories.map((c: unknown) => String(c).toLowerCase()).filter((c: string) => /^[a-z0-9_]{2,30}$/.test(c)))) as string[]
    : [];
  if (accountType === 'business' && !businessName) return no('Enter your business name.');
  if (accountType === 'business' && categorySlugs.length === 0) return no('Choose at least one business category.');

  const phone = normalizePhoneE164(body.phone);
  if (!phone) return no('Verify your mobile number first.', 400, 'phone_unverified');

  const displayName = cleanText(body.display_name, 60);
  if (!displayName) return no('Enter your name.');
  if (containsProfanity(displayName)) return no('Please use your real name.');

  const alias = checkAlias(body.alias);
  if (!alias.ok) return no(alias.error);
  const vibeLine = cleanText(body.vibe_line, 120);
  if (vibeLine && containsProfanity(vibeLine)) return no('Please rephrase your vibe line.');

  const campaign = typeof body.campaign === 'string' && /^[a-z0-9_-]{3,40}$/.test(body.campaign) ? body.campaign : null;

  return {
    ok: true,
    input: {
      dob, generation: generationOf(dob), city, state, country, accountType, businessName,
      categorySlugs: accountType === 'business' ? categorySlugs : [], phone, displayName, rawViberId: body.viber_id,
      alias: alias.alias, aliasMasked: Boolean(alias.alias && body.alias_masked), vibeLine, campaign, legacyPin: body.legacy_pin,
    },
  };
}
