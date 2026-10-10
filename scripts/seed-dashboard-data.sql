-- SEED SCRIPT FOR DASHBOARD & EOD ANALYTICS
-- Run this directly in your Supabase SQL Editor

-- 1. Create Mock Business
DO $$ 
DECLARE
  v_business_id UUID;
  v_order_id UUID;
  v_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Check if business exists
  SELECT id INTO v_business_id FROM businesses LIMIT 1;
  
  IF v_business_id IS NULL THEN
    v_business_id := gen_random_uuid();
    INSERT INTO businesses (id, categories, gst_number) 
    VALUES (v_business_id, ARRAY['cafe'], '07AAAAA0000A1Z5');
  END IF;

  -- 2. Insert Raw Inventory Items (Clear existing ones for this test)
  DELETE FROM raw_inventory_items WHERE business_id = v_business_id AND item_name IN ('Coffee Beans', 'Full Cream Milk', 'Matcha Powder');
  
  INSERT INTO raw_inventory_items (business_id, item_name, current_stock, unit, category, threshold, cost_per_unit) VALUES
  (v_business_id, 'Coffee Beans', 1.2, 'kg', 'Beverage', 5.0, 800),
  (v_business_id, 'Full Cream Milk', 8.0, 'litres', 'Dairy', 15.0, 60),
  (v_business_id, 'Matcha Powder', 25.0, 'kg', 'Beverage', 2.0, 1500);

  -- 3. Insert Orders & KOTs
  
  -- Order 1: 09:15
  v_order_id := gen_random_uuid();
  v_time := (CURRENT_DATE + interval '9 hours 15 minutes')::timestamp with time zone;
  INSERT INTO orders (id, business_id, subtotal, grand_total, payment_method, discount_amount, tax_amount, items, created_at) VALUES
  (v_order_id, v_business_id, 370, 370, 'UPI', 0, 66.6, '[{"id": "i1", "name": "Herbal Tea (Small)", "price": 150, "quantity": 1}, {"id": "i2", "name": "Espresso (Large)", "price": 220, "quantity": 1}]'::jsonb, v_time);
  INSERT INTO kitchen_tickets (business_id, order_id, ticket_number, table_or_room, items, status, created_at) VALUES
  (v_business_id, v_order_id, 'KOT-100', 'Table 1', '[{"id": "i1", "name": "Herbal Tea (Small)", "price": 150, "quantity": 1}, {"id": "i2", "name": "Espresso (Large)", "price": 220, "quantity": 1}]'::jsonb, 'SERVED', v_time);
  
  -- Order 2: 11:30
  v_order_id := gen_random_uuid();
  v_time := (CURRENT_DATE + interval '11 hours 30 minutes')::timestamp with time zone;
  INSERT INTO orders (id, business_id, subtotal, grand_total, payment_method, discount_amount, tax_amount, items, created_at) VALUES
  (v_order_id, v_business_id, 1350, 1200, 'CARD', 150, 216, '[{"id": "i3", "name": "Avocado Toast", "price": 450, "quantity": 2}, {"id": "i4", "name": "Iced Latte", "price": 300, "quantity": 1}]'::jsonb, v_time);
  INSERT INTO kitchen_tickets (business_id, order_id, ticket_number, table_or_room, items, status, created_at) VALUES
  (v_business_id, v_order_id, 'KOT-101', 'Table 2', '[{"id": "i3", "name": "Avocado Toast", "price": 450, "quantity": 2}, {"id": "i4", "name": "Iced Latte", "price": 300, "quantity": 1}]'::jsonb, 'SERVED', v_time);

  -- Order 3: 13:10
  v_order_id := gen_random_uuid();
  v_time := (CURRENT_DATE + interval '13 hours 10 minutes')::timestamp with time zone;
  INSERT INTO orders (id, business_id, subtotal, grand_total, payment_method, discount_amount, tax_amount, items, created_at) VALUES
  (v_order_id, v_business_id, 450, 450, 'UPI', 0, 81, '[{"id": "i5", "name": "Club Sandwich", "price": 450, "quantity": 1}]'::jsonb, v_time);
  INSERT INTO kitchen_tickets (business_id, order_id, ticket_number, table_or_room, items, status, created_at) VALUES
  (v_business_id, v_order_id, 'KOT-102', 'Table 3', '[{"id": "i5", "name": "Club Sandwich", "price": 450, "quantity": 1}]'::jsonb, 'SERVED', v_time);

  -- Order 4: 14:45
  v_order_id := gen_random_uuid();
  v_time := (CURRENT_DATE + interval '14 hours 45 minutes')::timestamp with time zone;
  INSERT INTO orders (id, business_id, subtotal, grand_total, payment_method, discount_amount, tax_amount, items, created_at) VALUES
  (v_order_id, v_business_id, 900, 850, 'CASH', 50, 153, '[{"id": "i1", "name": "Herbal Tea (Small)", "price": 150, "quantity": 2}, {"id": "i6", "name": "Caesar Salad", "price": 550, "quantity": 1}]'::jsonb, v_time);
  INSERT INTO kitchen_tickets (business_id, order_id, ticket_number, table_or_room, items, status, created_at) VALUES
  (v_business_id, v_order_id, 'KOT-103', 'Table 4', '[{"id": "i1", "name": "Herbal Tea (Small)", "price": 150, "quantity": 2}, {"id": "i6", "name": "Caesar Salad", "price": 550, "quantity": 1}]'::jsonb, 'SERVED', v_time);

  -- Order 5: 17:20
  v_order_id := gen_random_uuid();
  v_time := (CURRENT_DATE + interval '17 hours 20 minutes')::timestamp with time zone;
  INSERT INTO orders (id, business_id, subtotal, grand_total, payment_method, discount_amount, tax_amount, items, created_at) VALUES
  (v_order_id, v_business_id, 180, 180, 'UPI', 0, 32.4, '[{"id": "i2", "name": "Espresso (Large)", "price": 180, "quantity": 1}]'::jsonb, v_time);
  INSERT INTO kitchen_tickets (business_id, order_id, ticket_number, table_or_room, items, status, created_at) VALUES
  (v_business_id, v_order_id, 'KOT-104', 'Table 5', '[{"id": "i2", "name": "Espresso (Large)", "price": 180, "quantity": 1}]'::jsonb, 'PREPARING', v_time);

  -- Order 6: 19:30
  v_order_id := gen_random_uuid();
  v_time := (CURRENT_DATE + interval '19 hours 30 minutes')::timestamp with time zone;
  INSERT INTO orders (id, business_id, subtotal, grand_total, payment_method, discount_amount, tax_amount, items, created_at) VALUES
  (v_order_id, v_business_id, 940, 940, 'CARD', 0, 169.2, '[{"id": "i7", "name": "Pasta Alfredo", "price": 600, "quantity": 1}, {"id": "i8", "name": "Garlic Bread", "price": 340, "quantity": 1}]'::jsonb, v_time);
  INSERT INTO kitchen_tickets (business_id, order_id, ticket_number, table_or_room, items, status, created_at) VALUES
  (v_business_id, v_order_id, 'KOT-105', 'Table 6', '[{"id": "i7", "name": "Pasta Alfredo", "price": 600, "quantity": 1}, {"id": "i8", "name": "Garlic Bread", "price": 340, "quantity": 1}]'::jsonb, 'PREPARING', v_time);

  -- 4. Inventory Consumption Logs (For COGS chart)
  INSERT INTO inventory_logs (business_id, action_type, total_cost, change_amount, logged_at) VALUES
  (v_business_id, 'CONSUMPTION', 85, 1, (CURRENT_DATE + interval '9 hours 20 minutes')::timestamp with time zone),
  (v_business_id, 'CONSUMPTION', 320, 1, (CURRENT_DATE + interval '11 hours 45 minutes')::timestamp with time zone),
  (v_business_id, 'CONSUMPTION', 120, 1, (CURRENT_DATE + interval '13 hours 25 minutes')::timestamp with time zone),
  (v_business_id, 'CONSUMPTION', 240, 1, (CURRENT_DATE + interval '15 hours 0 minutes')::timestamp with time zone),
  (v_business_id, 'CONSUMPTION', 40, 1, (CURRENT_DATE + interval '17 hours 30 minutes')::timestamp with time zone),
  (v_business_id, 'CONSUMPTION', 280, 1, (CURRENT_DATE + interval '19 hours 45 minutes')::timestamp with time zone);

END $$;
