const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://webreflspgfpwvgazcze.supabase.co', 'sb_publishable_IlDkTCfDI14ODpNDuHp5fA_vQjvHOd_');

async function test() {
  const { data, error } = await supabase
    .from('kitchen_tickets')
    .select('*, orders(grand_total, payment_method)')
    .limit(1);
    
  console.log(error ? 'ERROR:' : 'DATA:');
  console.log(error || data);
}

test();
