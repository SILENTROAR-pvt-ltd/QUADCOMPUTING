import { describe, expect, it } from 'vitest';
import { calculateCompletionStatus } from './completion';

const emptyInput = {
  profile: null,
  propertyBranches: [],
  serviceCatalog: [],
};

describe('calculateCompletionStatus', () => {
  it('starts in Provisioning with no workspace data', () => {
    const result = calculateCompletionStatus(emptyInput);

    expect(result.score).toBe(0);
    expect(result.tier).toBe('Provisioning');
    expect(result.nextAction?.id).toBe('first-branch');
  });

  it('awards branch and catalog progress without storing completion state', () => {
    const result = calculateCompletionStatus({
      ...emptyInput,
      profile: {
        uniqueOwnerCafeId: 'HOST-CF-AB12-TEST' as never,
        displayName: 'Asha Rao',
        legalEntityName: 'Asha Hospitality',
        avatarUrl: null,
        bannerUrl: null,
        contact: { email: 'asha@example.com', phone: '+91 99999 99999' },
        ecosystemStatement: 'A'.repeat(120),
        categoriesHandled: ['cafe'],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      propertyBranches: [{
        id: 'branch_1' as never,
        name: 'North Star Cafe',
        category: 'cafe',
        gstNumber: null,
        bankName: null,
        bankAccountNumber: null,
        bankIfscCode: null,
        upiId: null,
        address: { line1: '12 Residency Road', line2: null, locality: 'Central', city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', country: 'IN' },
        geo: null,
        qrCodeHash: 'qr_hash' as never,
        status: 'live',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      }],
      serviceCatalog: [],
    });

    expect(result.score).toBeGreaterThan(0);
    expect(result.byGroup.branches.earned).toBeGreaterThan(0);
    expect(result.nextAction?.group).toBe('catalog');
  });
});
