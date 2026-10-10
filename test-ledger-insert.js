const url = 'https://webreflspgfpwvgazcze.supabase.co/rest/v1/usage_ledger';
const key = 'sb_publishable_IlDkTCfDI14ODpNDuHp5fA_vQjvHOd_';

async function checkLedger() {
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
      action_type: 'room_creation',
      cost: 10,
      reference_id: 'TEST-123'
    })
  });
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

checkLedger();
