-- 20261006000011_public_guest_menu.sql
-- Enables public read access to businesses, tables, and catalog items for guest menu operations

BEGIN;

-- Grant SELECT permissions to anon for required guest menu tables
GRANT SELECT ON public.businesses TO anon;
GRANT SELECT ON public.restaurant_tables TO anon;
GRANT SELECT ON public.catalog_items TO anon;

-- Re-enable open select policies for guest access 
-- (This allows the fallback anon key in adminDb() on localhost to successfully query the venue details)

DROP POLICY IF EXISTS "Allow public read of businesses" ON public.businesses;
CREATE POLICY "Allow public read of businesses" 
ON public.businesses FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Allow public read of restaurant_tables" ON public.restaurant_tables;
CREATE POLICY "Allow public read of restaurant_tables" 
ON public.restaurant_tables FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Allow public read of catalog_items" ON public.catalog_items;
CREATE POLICY "Allow public read of catalog_items" 
ON public.catalog_items FOR SELECT 
USING (true);

COMMIT;
