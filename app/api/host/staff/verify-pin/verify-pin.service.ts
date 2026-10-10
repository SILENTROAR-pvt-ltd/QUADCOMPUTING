import { checkPin, isPinSet } from '@/lib/services/security/venue-pin';
import { loadPinRow, upgradePin } from '@/lib/services/security/venue-pin.service';

export interface VerifyPinResult {
  status: number;
  data: {
    success: boolean;
    error?: string;
    securityEnabled?: boolean;
    requireIdentitySelection?: boolean;
    businessId?: string;
    staff?: { id: string; name: string; role: string; isAdmin: boolean };
    staffList?: Array<{ id: string; name: string; role: string }>;
  };
}

/**
 * Checks a PIN typed on the lock screen: the master PIN unlocks protected sections, the staff
 * PIN unlocks the POS and asks who is using it. PINs are compared against their hashes; an old
 * plain-text PIN is upgraded to a hash the first time it is entered correctly.
 */
export async function verifyPinCode(pinCode: string, businessId: string, supabase: any): Promise<VerifyPinResult> {
  const row = await loadPinRow(businessId);
  if (!row) return { status: 404, data: { success: false, error: 'Business not found' } };

  if (!isPinSet(row, 'admin') && !isPinSet(row, 'staff')) {
    return {
      status: 403,
      data: { success: false, securityEnabled: false, error: 'No PIN is set for this venue yet. Set one in My Profile → Security.' },
    };
  }

  const pin = String(pinCode || '').trim();
  const master = await checkPin(row, 'admin', pin);
  if (master.ok) {
    if (master.upgrade) await upgradePin(businessId, 'admin', pin);
    return { status: 200, data: { success: true, staff: { id: 'master-admin', name: 'Master Admin', role: 'HOST', isAdmin: true } } };
  }

  const staff = await checkPin(row, 'staff', pin);
  if (staff.ok) {
    if (staff.upgrade) await upgradePin(businessId, 'staff', pin);
    const { data: staffList } = await supabase
      .from('staff_profiles').select('id, name, role')
      .eq('business_id', businessId).eq('is_pos_active', true).order('name');
    return { status: 200, data: { success: true, requireIdentitySelection: true, businessId, staffList: staffList || [] } };
  }

  return { status: 401, data: { success: false, error: 'Invalid PIN' } };
}
