import { createHash } from 'crypto';

/**
 * DPDP Act 2023 (Sec 12) & GDPR (Art 17) Right to Erasure / Data Anonymization Engine.
 * Anonymizes guest personal data while preserving financial ledger totals, tax accounting
 * records, and folio integrity required by Section 36 of CGST Act 2017.
 */

export interface AnonymizationTarget {
  id: string;
  business_id: string;
  guest_name?: string | null;
  guest_phone?: string | null;
  guest_email?: string | null;
  guest_address?: string | null;
  id_number?: string | null;
  id_type?: string | null;
  guest_id_proof?: string | null;
  id_proof_path?: string | null;
  passport_number?: string | null;
  visa_number?: string | null;
  country_of_origin?: string | null;
  total_billed_amount?: number | null;
}

export function computeAnonymizedIdentifier(originalValue: string, salt: string = 'dpdp_erasure_salt'): string {
  return createHash('sha256').update(`${salt}:${originalValue.trim().toLowerCase()}`).digest('hex').slice(0, 12);
}

export function generateAnonymizedGuestRecord(target: AnonymizationTarget, salt?: string) {
  const hashSuffix = target.guest_phone
    ? computeAnonymizedIdentifier(target.guest_phone, salt)
    : computeAnonymizedIdentifier(target.id, salt);

  return {
    guest_name: `ANONYMIZED_GUEST_${hashSuffix.toUpperCase()}`,
    guest_phone: `+91-XXXXXX${hashSuffix.slice(-4)}`,
    guest_email: null,
    guest_address: null,
    id_number: null,
    id_type: null,
    guest_id_proof: null,
    id_proof_path: null,
    passport_number: null,
    visa_number: null,
    country_of_origin: null,
    visa_expiry_date: null,
    anonymized_at: new Date().toISOString(),
    erasure_compliance_basis: 'DPDP_ACT_2023_SEC_12',
  };
}

/**
 * Executes DB-level anonymization on a historical stay log entry
 */
export async function anonymizeStayLog(
  supabase: any,
  businessId: string,
  stayLogId: string
): Promise<{ success: boolean; anonymized_id: string; error?: string }> {
  const { data: record, error: fetchErr } = await supabase
    .from('room_stay_logs')
    .select('id, business_id, guest_name, guest_phone, total_billed_amount')
    .eq('id', stayLogId)
    .eq('business_id', businessId)
    .maybeSingle();

  if (fetchErr || !record) {
    return { success: false, anonymized_id: '', error: 'Stay log record not found or inaccessible.' };
  }

  const anonymizedFields = generateAnonymizedGuestRecord(record);

  const { error: updateErr } = await supabase
    .from('room_stay_logs')
    .update(anonymizedFields)
    .eq('id', stayLogId)
    .eq('business_id', businessId);

  if (updateErr) {
    return { success: false, anonymized_id: '', error: updateErr.message };
  }

  return { success: true, anonymized_id: anonymizedFields.guest_name };
}
