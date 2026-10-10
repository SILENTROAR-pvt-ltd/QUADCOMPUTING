import { z } from 'zod';

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
  categories: z.array(z.string()).min(1, 'Select at least one category'),
  businesses: z
    .array(businessLocationSchema)
    .min(1, 'At least one business location is required'),
});

export type HostOnboardingForm = z.infer<typeof hostOnboardingSchema>;
