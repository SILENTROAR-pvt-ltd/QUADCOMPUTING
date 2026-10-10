const url = 'https://webreflspgfpwvgazcze.supabase.co/rest/v1/venue_outstanding_bills';
const key = 'sb_publishable_IlDkTCfDI14ODpNDuHp5fA_vQjvHOd_';

async function checkConstraint() {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        venue_id: 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269',
        reference_id: 'TEST-ROOM-ACC',
        description: 'Test',
        item_type: 'room_accommodation', 
        amount: 10,
        status: 'unpaid'
      })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
    return res;
  } catch (error) {
    console.error("Error checking constraint:", error);
    return null;
  }
}

checkConstraint();
