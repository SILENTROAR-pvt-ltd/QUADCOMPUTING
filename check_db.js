require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// or use service role if needed

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing Supabase env vars");
  process.exit(1);
}

const WebSocket = require('ws');
const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    transport: WebSocket
  }
});

async function checkDb() {
  const { data: b, error: e1 } = await supabase.from('businesses').select('*');
  console.log("Businesses:", JSON.stringify(b, null, 2));
  console.log("Error1:", e1);
  
  const { data: l, error: e2 } = await supabase.from('locations').select('*');
  console.log("Locations:", JSON.stringify(l, null, 2));
  console.log("Error2:", e2);
}

checkDb();
