-- Migration: Expand venue_outstanding_bills item_type check constraint
-- Allows all micro-fee item types (room_creation, menu_item_creation, etc.)

ALTER TABLE public.venue_outstanding_bills 
  DROP CONSTRAINT IF EXISTS venue_outstanding_bills_item_type_check;

ALTER TABLE public.venue_outstanding_bills 
  ADD CONSTRAINT venue_outstanding_bills_item_type_check 
  CHECK (item_type IN (
    'bill_generate', 
    'menu_addon', 
    'menu_addon_creation', 
    'menu_item_creation', 
    'room_accommodation', 
    'room_creation', 
    'other'
  ));
