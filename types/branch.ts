import type { Brand, CategoryHandled, ISODateString } from './host';

export type BranchId = Brand<string, 'BranchId'>;
export type GstNumber = Brand<string, 'GstNumber'>;
export type QrCodeHash = Brand<string, 'QrCodeHash'>;

export interface BranchAddress {
  line1: string;
  line2: string | null;
  locality: string;
  city: string;
  state: string;
  postalCode: string;
  country: 'IN';
}

export type BranchStatus = 'draft' | 'live' | 'suspended';

export interface PropertyBranch {
  id: BranchId;
  name: string;
  category: CategoryHandled;
  gstNumber: GstNumber | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankIfscCode: string | null;
  upiId: string | null;
  address: BranchAddress;
  geo: { lat: number; lng: number } | null;
  qrCodeHash: QrCodeHash | null;
  status: BranchStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
