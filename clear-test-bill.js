const url = 'https://webreflspgfpwvgazcze.supabase.co/rest/v1/venue_outstanding_bills?reference_id=eq.QC-TEST-OUTSTANDING-ROOM';
const key = 'sb_publishable_IlDkTCfDI14ODpNDuHp5fA_vQjvHOd_';

async function clearTestBill() {
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    console.log("Status:", res.status);
    return res;
  } catch (error) {
    console.error("Error clearing test bill:", error);
    return null;
  }
}

clearTestBill();
