const url = 'https://webreflspgfpwvgazcze.supabase.co/rest/v1/rooms';
const key = 'sb_publishable_IlDkTCfDI14ODpNDuHp5fA_vQjvHOd_';

async function checkRooms() {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      business_id: 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269',
      category_id: 'cb61cf2c-bd2f-48d8-bd2e-50361309dff2', // Getting this from a random room or I need to fetch it first
      room_number: 'TEST-1234',
      status: 'VACANT',
      qr_code_hash: 'TEST'
    })
  });
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

async function getCategory() {
  const res = await fetch('https://webreflspgfpwvgazcze.supabase.co/rest/v1/room_categories?limit=1', {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const data = await res.json();
  return data[0]?.id;
}

async function run() {
  const cat = await getCategory();
  console.log("Category ID:", cat);
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      business_id: 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269',
      category_id: cat,
      room_number: 'TEST-1234',
      status: 'VACANT',
      qr_code_hash: 'TEST-HASH'
    })
  });
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

run();
