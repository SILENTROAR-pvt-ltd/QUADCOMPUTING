import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function testAddRoom() {
  console.log("=== Testing Add Room API ===");
  
  // 1. Get a venue (business)
  const { data: businesses, error: bizErr } = await supabase.from('businesses').select('id, host_id').limit(1);
  if (bizErr || !businesses.length) {
    console.error("Failed to fetch business:", bizErr);
    return;
  }
  const business = businesses[0];
  console.log("Found Business:", business.id);

  // 2. Get a room category
  const { data: categories, error: catErr } = await supabase.from('room_categories').select('id').eq('business_id', business.id).limit(1);
  if (catErr || !categories.length) {
    console.error("Failed to fetch category:", catErr);
    return;
  }
  const categoryId = categories[0].id;
  console.log("Found Category:", categoryId);

  // 3. Make the API POST request simulating the frontend
  // But wait, the API requires the user to be logged in and relies on supabase.auth.getUser() on the server side.
  // Since we are not passing a session cookie, the API might fail to identify the business, UNLESS it has a fallback.
  // Let's check the API: "if (!business) { const { data: fb } = await supabase.from('businesses').select('id').limit(1).maybeSingle(); business = fb; }"
  // The API has a fallback! It will use the first business if user is not found.
  
  try {
    const res = await fetch('http://localhost:3000/api/host/accommodations/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        category_id: categoryId,
        room_number: `T-${Math.floor(Math.random() * 1000)}`
      })
    });
    
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response Body:", text);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testAddRoom();
