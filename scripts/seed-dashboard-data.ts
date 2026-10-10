import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import WebSocket from 'ws';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Or SERVICE_ROLE_KEY if available

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: {
    // @ts-ignore
    transport: WebSocket
  }
});

async function seedData() {
  console.log('🌱 Seeding Dashboard Test Data...');

  try {
    // 1. Ensure a default business exists
    let { data: business } = await supabase
      .from('businesses')
      .select('id')
      .limit(1)
      .single();

    let businessId: string;

    if (!business) {
      console.log('No business found. Creating mock business...');
      businessId = uuidv4();
      const { error: bizErr } = await supabase.from('businesses').insert({
        id: businessId,
        categories: ['cafe'],
        gst_number: '07AAAAA0000A1Z5'
      });
      if (bizErr) throw bizErr;
    } else {
      businessId = business.id;
    }
    
    console.log(`✅ Business ID resolved: ${businessId}`);

    // Generate timestamps for today
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const getTimestamp = (hour: number, min: number) => {
      const d = new Date();
      d.setHours(hour, min, 0, 0);
      return d.toISOString();
    };

    // 2. Raw Inventory Items
    console.log('📦 Injecting Critical Raw Inventory...');
    const { error: invErr } = await supabase.from('raw_inventory_items').insert([
      { business_id: businessId, item_name: 'Coffee Beans', current_stock: 1.2, unit: 'kg', reorder_level: 5.0, category: 'Beverage', threshold: 5.0, cost_per_unit: 800 },
      { business_id: businessId, item_name: 'Full Cream Milk', current_stock: 8.0, unit: 'litres', reorder_level: 15.0, category: 'Dairy', threshold: 15.0, cost_per_unit: 60 },
      { business_id: businessId, item_name: 'Matcha Powder', current_stock: 25.0, unit: 'kg', reorder_level: 2.0, category: 'Beverage', threshold: 2.0, cost_per_unit: 1500 }
    ]);
    if (invErr) console.warn('Inventory Insert Warn:', invErr.message);

    // 3. Orders
    console.log('🧾 Creating Orders...');
    const ordersData = [
      { t: getTimestamp(9, 15), total: 370, pm: 'UPI', disc: 0, items: [{id: 'i1', name: 'Herbal Tea (Small)', price: 150, qty: 1}, {id: 'i2', name: 'Espresso (Large)', price: 220, qty: 1}] },
      { t: getTimestamp(11, 30), total: 1200, pm: 'CARD', disc: 150, items: [{id: 'i3', name: 'Avocado Toast', price: 450, qty: 2}, {id: 'i4', name: 'Iced Latte', price: 300, qty: 1}] },
      { t: getTimestamp(13, 10), total: 450, pm: 'UPI', disc: 0, items: [{id: 'i5', name: 'Club Sandwich', price: 450, qty: 1}] },
      { t: getTimestamp(14, 45), total: 850, pm: 'CASH', disc: 50, items: [{id: 'i1', name: 'Herbal Tea (Small)', price: 150, qty: 2}, {id: 'i6', name: 'Caesar Salad', price: 550, qty: 1}] },
      { t: getTimestamp(17, 20), total: 180, pm: 'UPI', disc: 0, items: [{id: 'i2', name: 'Espresso (Large)', price: 180, qty: 1}] },
      { t: getTimestamp(19, 30), total: 940, pm: 'CARD', disc: 0, items: [{id: 'i7', name: 'Pasta Alfredo', price: 600, qty: 1}, {id: 'i8', name: 'Garlic Bread', price: 340, qty: 1}] },
    ];

    const generatedOrders: any[] = [];
    for (const o of ordersData) {
      const orderId = uuidv4();
      generatedOrders.push({
        id: orderId,
        business_id: businessId,
        grand_total: o.total,
        payment_method: o.pm,
        discount_amount: o.disc,
        tax_amount: o.total * 0.18, // 18% mock tax
        items: o.items,
        created_at: o.t,
        status: 'PAID'
      });
    }

    const { error: ordErr } = await supabase.from('orders').insert(generatedOrders);
    if (ordErr) console.warn('Orders Insert Warn:', ordErr.message);

    // 4. Kitchen Tickets
    console.log('🍳 Injecting KOTs...');
    const ticketsData = [
      { order_id: generatedOrders[0].id, t: generatedOrders[0].created_at, status: 'SERVED' },
      { order_id: generatedOrders[1].id, t: generatedOrders[1].created_at, status: 'SERVED' },
      { order_id: generatedOrders[2].id, t: generatedOrders[2].created_at, status: 'SERVED' },
      { order_id: generatedOrders[3].id, t: generatedOrders[3].created_at, status: 'SERVED' },
      { order_id: generatedOrders[4].id, t: generatedOrders[4].created_at, status: 'PREPARING' },
      { order_id: generatedOrders[5].id, t: generatedOrders[5].created_at, status: 'PREPARING' },
    ];
    
    const kots = ticketsData.map((t, idx) => ({
      business_id: businessId,
      order_id: t.order_id,
      ticket_number: `KOT-${idx+100}`,
      table_or_room: `Table ${idx+1}`,
      items: generatedOrders[idx].items,
      status: t.status,
      created_at: t.t
    }));

    const { error: kotErr } = await supabase.from('kitchen_tickets').insert(kots);
    if (kotErr) console.warn('KOT Insert Warn:', kotErr.message);

    // 5. Inventory Consumption Logs
    console.log('📉 Faking COGS (Consumption Logs)...');
    const logsData = [
      { t: getTimestamp(9, 20), cost: 85 },
      { t: getTimestamp(11, 45), cost: 320 },
      { t: getTimestamp(13, 25), cost: 120 },
      { t: getTimestamp(15, 0), cost: 240 },
      { t: getTimestamp(17, 30), cost: 40 },
      { t: getTimestamp(19, 45), cost: 280 },
    ];

    const logs = logsData.map(l => ({
      business_id: businessId,
      action_type: 'CONSUMPTION',
      total_cost: l.cost,
      created_at: l.t,
      item_id: null,
      quantity: 1
    }));

    const { error: logErr } = await supabase.from('inventory_logs').insert(logs);
    if (logErr) console.warn('Logs Insert Warn:', logErr.message);

    console.log('🎉 Seeding Complete! Dashboard should now be populated.');
    
  } catch (error) {
    console.error('Fatal Seeding Error:', error);
  }
}

seedData();
