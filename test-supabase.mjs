import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://webreflspgfpwvgazcze.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_IlDkTCfDI14ODpNDuHp5fA_vQjvHOd_';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data, error } = await supabase.from('businesses').select('id, name');
  if (error) {
    console.error('Error fetching businesses:', error);
  } else {
    console.log('Businesses:', JSON.stringify(data, null, 2));
  }
}

main();
