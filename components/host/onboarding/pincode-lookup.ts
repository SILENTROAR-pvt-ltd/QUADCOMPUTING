/** City and state for an Indian PIN code, or null. The fields stay editable when the lookup fails. */
export async function lookupPincode(pincode: string): Promise<{ city: string; state: string } | null> {
  if (!/^\d{6}$/.test(pincode)) return null;
  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const data = await response.json();
    const office = data?.[0]?.PostOffice?.[0];
    if (data?.[0]?.Status !== 'Success' || !office) return null;
    return { city: String(office.District || ''), state: String(office.State || '') };
  } catch {
    return null;
  }
}
