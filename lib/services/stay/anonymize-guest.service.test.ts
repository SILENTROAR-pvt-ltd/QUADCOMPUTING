import { describe, it, expect } from 'vitest';
import {
  generateAnonymizedGuestRecord,
  computeAnonymizedIdentifier,
  anonymizeStayLog,
  type AnonymizationTarget,
} from './anonymize-guest.service';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';


describe('DPDP Act 2023 Right to Erasure & Anonymization Engine', () => {
  const target: AnonymizationTarget = {
    id: 'stay-1234',
    business_id: 'biz-5678',
    guest_name: 'Rahul Sharma',
    guest_phone: '9876543210',
    guest_email: 'rahul@example.com',
    guest_address: 'Flat 402, Mumbai',
    id_type: 'Aadhaar Card',
    id_number: '1234-5678-9012',
    guest_id_proof: 'Aadhaar Card: 1234-5678-9012',
    id_proof_path: 'biz-5678/id-123.jpg',
    passport_number: 'P9876543',
    visa_number: 'V887766',
    country_of_origin: 'India',
    total_billed_amount: 15400,
  };

  it('anonymizes PII fields while retaining identity hash and compliance audit basis', () => {
    const anonymized = generateAnonymizedGuestRecord(target, 'test_salt');
    expect(anonymized.guest_name).toMatch(/^ANONYMIZED_GUEST_[A-F0-9]{12}$/);
    expect(anonymized.guest_phone).toMatch(/^\+91-XXXXXX[a-f0-9]{4}$/);
    expect(anonymized.guest_email).toBeNull();
    expect(anonymized.guest_address).toBeNull();
    expect(anonymized.id_number).toBeNull();
    expect(anonymized.id_proof_path).toBeNull();
    expect(anonymized.passport_number).toBeNull();
    expect(anonymized.erasure_compliance_basis).toBe('DPDP_ACT_2023_SEC_12');
  });

  it('updates the database stay log record atomically', async () => {
    const db = createFakeSupabase({
      room_stay_logs: [{ ...target }],
    });

    const res = await anonymizeStayLog(db, 'biz-5678', 'stay-1234');
    expect(res.success).toBe(true);
    expect(res.anonymized_id).toMatch(/^ANONYMIZED_GUEST_/);

    const updated = db.tables.room_stay_logs.find((r: any) => r.id === 'stay-1234');
    expect(updated).toBeDefined();
    expect(updated?.guest_email).toBeNull();
    expect(updated?.id_number).toBeNull();
    expect(updated?.total_billed_amount).toBe(15400); // Ledger integrity preserved
  });

});
