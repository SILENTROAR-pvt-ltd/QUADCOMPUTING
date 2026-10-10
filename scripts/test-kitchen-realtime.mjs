import WebSocket from 'ws';
globalThis.WebSocket = WebSocket;

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://webreflspgfpwvgazcze.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_IlDkTCfDI14ODpNDuHp5fA_vQjvHOd_';

console.log('[Test Realtime] Connecting to:', SUPABASE_URL);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const testBizId = '00000000-0000-0000-0000-000000000001';

const channel = supabase
  .channel(`test-kitchen-realtime-${Date.now()}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'kitchen_tickets',
      filter: `business_id=eq.${testBizId}`,
    },
    (payload) => {
      console.log('[Realtime Event: kitchen_tickets]', payload.eventType);
    }
  )
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'order_items',
      filter: `business_id=eq.${testBizId}`,
    },
    (payload) => {
      console.log('[Realtime Event: order_items]', payload.eventType);
    }
  );

const timeout = setTimeout(() => {
  console.log('[Test Realtime] Timed out waiting for channel subscription.');
  process.exit(1);
}, 10000);

channel.subscribe((status, err) => {
  console.log('[Test Realtime] Channel subscription status:', status, err ? JSON.stringify(err) : '');
  if (status === 'SUBSCRIBED') {
    console.log('[Test Realtime] SUCCESS: postgres_changes channel successfully subscribed for kitchen_tickets & order_items!');
    clearTimeout(timeout);
    supabase.removeChannel(channel).then(() => {
      console.log('[Test Realtime] Channel cleanly removed. Test passed.');
      process.exit(0);
    });
  } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
    console.log('[Test Realtime] Channel error:', status, err);
    clearTimeout(timeout);
    process.exit(1);
  }
});
