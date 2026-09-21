export type Brand<T, B extends string> = T & { readonly __brand: B };
export type ISODateString = string;
export type OwnerCafeId = Brand<string, 'OwnerCafeId'>;
export const CATEGORIES_HANDLED = ['cafe', 'restaurant', 'resort', 'dorm', 'estate'] as const;
export type CategoryHandled = (typeof CATEGORIES_HANDLED)[number];

export interface HostContact { email: string; phone: string | null; }

export interface HostProfile {
  readonly uniqueOwnerCafeId: OwnerCafeId;
  displayName: string;
  legalEntityName: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  contact: HostContact;
  ecosystemStatement: string;
  categoriesHandled: CategoryHandled[];
  offersAccommodation?: boolean;
  dob?: string;
  gender?: string;
  readonly createdAt: ISODateString;
  updatedAt: ISODateString;
}

