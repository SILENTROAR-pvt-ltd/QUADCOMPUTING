import { z } from 'zod';
import { normalizeVenueTypes } from '@/lib/venue/venue-model';
import { START_PLANS } from '@/lib/services/wallet/start-plan';

export const businessLocationSchema = z.object({
  businessName: z.string().min(2, 'Business name is required'),
  gstNumber: z.string().optional(),
  pincode: z.string().regex(/^\d{6}$/, 'PIN code must be exactly 6 digits'),
  state: z.string().min(2, 'State is required'),
  city: z.string().min(2, 'City is required'),
  address: z.string().min(5, 'Full street address is required'),
});

export const hostOnboardingSchema = z.object({
  title: z.enum(['Mr.', 'Mrs.', 'Ms.', 'Dr.']).optional(),
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say'], {
    error: 'Please select a gender option',
  }),
  dob: z.string().min(1, 'Date of birth is required'),
  // The same venue types the profile uses (cafe, hotel, homestay…): they decide the sidebar sections.
  categories: z.array(z.string())
    .transform((v) => normalizeVenueTypes(v))
    .refine((v) => v.length > 0, 'Choose what you run: a café, a homestay, or both.'),
  businesses: z
    .array(businessLocationSchema)
    .min(1, 'At least one business location is required'),
  /** The first month: a free trial of M²-Pro or M¹-Pro, or Rhodium per bill. Unset: the default for the venue type. */
  startPlan: z.enum(START_PLANS).optional(),
});

export type HostOnboardingForm = z.infer<typeof hostOnboardingSchema>;
