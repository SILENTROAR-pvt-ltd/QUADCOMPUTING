# PART D — ROUTE INVENTORY TABLE & PUBLIC SCHEMA RLS MATRIX

## 1. Route Inventory Table

Total API Route Handlers Analyzed: 101

| METHOD | Path | Auth Type | Supabase Client | Role Check | Business ID / Ownership Verified How | Rate-Limited? | Idempotent? | Zod Validated? | Tables Read/Written | RPCs Called | Returns on Error |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/app/api/admin/reset-balance` | none | anon-with-user-JWT | none | none | none | none | No | venue_wallets, venue_subscriptions, usage_ledger | none | `{ success: false, error: string }` |
| `GET` | `/app/api/admin/topup-requests` | none | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `POST` | `/app/api/admin/topup-requests` | none | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `POST` | `/app/api/guest/call-staff` | guest-session | anon-with-user-JWT | staff | payload body.business_id | none | none | No | staff_notifications | none | `{ success: false, error: string }` |
| `GET` | `/app/api/guest/lobby` | guest-session | anon-with-user-JWT | none | none | none | none | No | lobby_messages, private_chat_messages, table_invitations, private_chats | none | `{ success: false, error: string }` |
| `POST` | `/app/api/guest/lobby` | guest-session | anon-with-user-JWT | none | none | none | none | No | lobby_messages, private_chat_messages, table_invitations, private_chats | none | `{ success: false, error: string }` |
| `PATCH` | `/app/api/guest/lobby` | guest-session | anon-with-user-JWT | none | none | none | none | No | lobby_messages, private_chat_messages, table_invitations, private_chats | none | `{ success: false, error: string }` |
| `GET` | `/app/api/guest/menu` | guest-session | anon-with-user-JWT | none | query .eq("business_id") | none | none | No | businesses, restaurant_tables, catalog_items | none | `{ success: false, error: string }` |
| `GET` | `/app/api/guest/onboard` | guest-session | service-role | none | none | none | none | No | guest_sessions | none | `{ success: false, error: string }` |
| `POST` | `/app/api/guest/onboard` | guest-session | service-role | none | none | none | none | No | guest_sessions | none | `{ success: false, error: string }` |
| `GET` | `/app/api/guest/order` | guest-session | anon-with-user-JWT | none | payload body.business_id | none | Yes (2,000ms) | No | none | none | `{ success: false, error, code }` |
| `POST` | `/app/api/guest/order` | guest-session | anon-with-user-JWT | none | payload body.business_id | none | Yes (2,000ms) | No | none | none | `{ success: false, error, code }` |
| `GET` | `/app/api/guest/reviews` | guest-session | anon-with-user-JWT | none | query .eq("business_id") | none | none | No | venue_reviews | none | `{ success: false, error: string }` |
| `POST` | `/app/api/guest/reviews` | guest-session | anon-with-user-JWT | none | query .eq("business_id") | none | none | No | venue_reviews | none | `{ success: false, error: string }` |
| `GET` | `/app/api/guest/session` | none | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `POST` | `/app/api/guest/session` | none | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `PATCH` | `/app/api/guest/session` | none | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `GET` | `/app/api/guest/wallet/redeem` | none | anon-with-user-JWT | none | payload body.business_id | none | Yes (2,000ms) | No | none | none | `{ success: false, error: string }` |
| `POST` | `/app/api/guest/wallet/redeem` | none | anon-with-user-JWT | none | payload body.business_id | none | Yes (2,000ms) | No | none | none | `{ success: false, error: string }` |
| `GET` | `/app/api/guest/wallet` | none | anon-with-user-JWT | none | payload body.business_id | none | none | No | none | none | `{ success: false, error: string }` |
| `POST` | `/app/api/guest/wallet` | none | anon-with-user-JWT | none | payload body.business_id | none | none | No | none | none | `{ success: false, error: string }` |
| `GET` | `/app/api/host/accommodations/categories` | JWT-cookie | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/accommodations/categories` | JWT-cookie | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `PATCH` | `/app/api/host/accommodations/categories` | JWT-cookie | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `DELETE` | `/app/api/host/accommodations/categories` | JWT-cookie | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `GET` | `/app/api/host/accommodations/history` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | No | businesses, room_stay_logs | none | `{ success: false, error: string }` |
| `GET` | `/app/api/host/accommodations/rooms` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | No | businesses, rooms, orders | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/accommodations/rooms` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | No | businesses, rooms, orders | none | `{ success: false, error: string }` |
| `PATCH` | `/app/api/host/accommodations/rooms` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | No | businesses, rooms, orders | none | `{ success: false, error: string }` |
| `DELETE` | `/app/api/host/accommodations/rooms` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | No | businesses, rooms, orders | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/accommodations/rooms/[id]/checkout` | guest-session | anon-with-user-JWT | none | payload body.business_id | none | none | No | rooms, orders, room_stay_logs | none | `{ success: false, error: string }` |
| `GET` | `/app/api/host/accommodations/rooms/[id]/dossier` | JWT-cookie | anon-with-user-JWT | none | none | none | none | No | rooms, orders, kitchen_tickets, room_stay_logs | none | `{ success: false, error: string }` |
| `GET` | `/app/api/host/accommodations/rooms/[id]/orders` | JWT-cookie | anon-with-user-JWT | none | none | none | none | No | orders, kitchen_tickets | none | `{ success: false, error: string }` |
| `PATCH` | `/app/api/host/accommodations/rooms/[id]/status` | guest-session | anon-with-user-JWT | none | payload body.business_id | none | none | No | orders, room_stay_logs, rooms | none | `{ success: false, error: string }` |
| `GET` | `/app/api/host/analytics/eod-report` | none | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `GET` | `/app/api/host/analytics/eod-z-report` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | No | businesses, orders | none | `{ success: false, error: string }` |
| `GET` | `/app/api/host/analytics` | none | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/catalog/ai-ingest` | JWT-cookie | anon-with-user-JWT | none | none | none | none | Yes | none | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/catalog/auto-fill-images` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | No | businesses, catalog_items | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/catalog/bulk-insert` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | No | businesses, locations, catalog_items, inventory_stock | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/catalog/bulk-price-update` | JWT-cookie | anon-with-user-JWT | host | payload body.business_id | none | none | No | businesses, locations, catalog_items | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/catalog/create` | JWT-cookie | anon-with-user-JWT | none | payload body.business_id | none | none | No | locations, catalog_items, inventory_stock | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/catalog/delete` | none | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `DELETE` | `/app/api/host/catalog/delete` | none | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `GET` | `/app/api/host/catalog/recipe` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | No | recipe_ingredients, businesses | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/catalog/recipe` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | No | recipe_ingredients, businesses | none | `{ success: false, error: string }` |
| `GET` | `/app/api/host/catalog` | JWT-cookie | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/catalog` | JWT-cookie | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `DELETE` | `/app/api/host/catalog` | JWT-cookie | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/catalog/update` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | No | catalog_items, room_categories, businesses, inventory_stock | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/expenses/advances` | JWT-cookie | anon-with-user-JWT | host | payload body.business_id | none | none | No | businesses, staff_advances | none | `{ success: false, error: string }` |
| `GET` | `/app/api/host/expenses/bills` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | No | businesses, operational_expenses | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/expenses/bills` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | No | businesses, operational_expenses | none | `{ success: false, error: string }` |
| `GET` | `/app/api/host/expenses/staff` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | No | businesses, staff_profiles, staff_advances | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/expenses/staff` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | No | businesses, staff_profiles, staff_advances | none | `{ success: false, error: string }` |
| `PUT` | `/app/api/host/expenses/staff` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | No | businesses, staff_profiles, staff_advances | none | `{ success: false, error: string }` |
| `DELETE` | `/app/api/host/expenses/staff` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | No | businesses, staff_profiles, staff_advances | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/inventory/audit` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | No | businesses, raw_inventory_items, inventory_logs, inventory_audits | none | `{ success: false, error: string }` |
| `GET` | `/app/api/host/inventory/items` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | No | businesses, raw_inventory_items, inventory_logs | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/inventory/items` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | No | businesses, raw_inventory_items, inventory_logs | none | `{ success: false, error: string }` |
| `PATCH` | `/app/api/host/inventory/items` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | No | businesses, raw_inventory_items, inventory_logs | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/inventory/ocr-ingest` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | No | businesses, raw_inventory_items, inventory_logs | none | `{ success: false, error: string }` |
| `GET` | `/app/api/host/kitchen/tickets` | none | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/kitchen/tickets` | none | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `PATCH` | `/app/api/host/kitchen/tickets` | none | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/orders/create` | none | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `GET` | `/app/api/host/orders/history` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | No | businesses, orders | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/orders/update-status` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | No | businesses, orders, recipe_ingredients | deduct_inventory_stock | `{ success: false, error: string }` |
| `GET` | `/app/api/host/profile` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | No | businesses, profiles, locations | none | `{ success: false, error: string }` |
| `PATCH` | `/app/api/host/profile` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | No | businesses, profiles, locations | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/profile/update` | JWT-cookie | anon-with-user-JWT | host | query .eq("business_id") | none | none | Yes | businesses, profiles, locations | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/promotions` | JWT-cookie | anon-with-user-JWT | none | payload body.business_id | none | none | No | profiles, orders, promotions | none | `{ success: false, error: string }` |
| `DELETE` | `/app/api/host/promotions` | JWT-cookie | anon-with-user-JWT | none | payload body.business_id | none | none | No | profiles, orders, promotions | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/provision` | none | anon-with-user-JWT | none | none | none | none | Yes | none | none | `{ success: false, error: string }` |
| `GET` | `/app/api/host/security/status` | JWT-cookie | anon-with-user-JWT | host | none | none | none | Yes | businesses | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/sessions/fee` | none | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `GET` | `/app/api/host/sessions` | guest-session | anon-with-user-JWT | none | payload body.business_id | none | Yes (2,000ms) | No | none | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/sessions` | guest-session | anon-with-user-JWT | none | payload body.business_id | none | Yes (2,000ms) | No | none | none | `{ success: false, error: string }` |
| `PATCH` | `/app/api/host/sessions` | guest-session | anon-with-user-JWT | none | payload body.business_id | none | Yes (2,000ms) | No | none | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/staff/verify-pin` | none | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `GET` | `/app/api/host/tables` | JWT-cookie | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/tables` | JWT-cookie | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `PATCH` | `/app/api/host/tables` | JWT-cookie | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `DELETE` | `/app/api/host/tables` | JWT-cookie | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `GET` | `/app/api/host/wallet/outstanding` | none | anon-with-user-JWT | none | none | none | none | No | venue_outstanding_bills | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/wallet/outstanding` | none | anon-with-user-JWT | none | none | none | none | No | venue_outstanding_bills | none | `{ success: false, error: string }` |
| `GET` | `/app/api/host/wallet/redeem` | guest-session | anon-with-user-JWT | none | payload body.business_id | none | Yes (2,000ms) | No | none | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/wallet/redeem` | guest-session | anon-with-user-JWT | none | payload body.business_id | none | Yes (2,000ms) | No | none | none | `{ success: false, error: string }` |
| `GET` | `/app/api/host/wallet` | none | anon-with-user-JWT | none | none | none | none | No | businesses | none | `{ success: false, error: string }` |
| `POST` | `/app/api/host/wallet` | none | anon-with-user-JWT | none | none | none | none | No | businesses | none | `{ success: false, error: string }` |
| `GET` | `/app/api/tables` | none | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `POST` | `/app/api/tables` | none | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `PATCH` | `/app/api/tables` | none | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `DELETE` | `/app/api/tables` | none | anon-with-user-JWT | none | none | none | none | No | none | none | `{ success: false, error: string }` |
| `GET` | `/app/api/venue/offers` | none | anon-with-user-JWT | none | payload body.business_id | none | none | No | venue_live_offers | none | `{ success: false, error: string }` |
| `POST` | `/app/api/venue/offers` | none | anon-with-user-JWT | none | payload body.business_id | none | none | No | venue_live_offers | none | `{ success: false, error: string }` |
| `PATCH` | `/app/api/venue/offers` | none | anon-with-user-JWT | none | payload body.business_id | none | none | No | venue_live_offers | none | `{ success: false, error: string }` |
| `DELETE` | `/app/api/venue/offers` | none | anon-with-user-JWT | none | payload body.business_id | none | none | No | venue_live_offers | none | `{ success: false, error: string }` |
| `GET` | `/app/api/venue/photo-vault` | none | anon-with-user-JWT | none | payload body.business_id | none | none | No | venue_photo_vault | none | `{ success: false, error: string }` |
| `POST` | `/app/api/venue/photo-vault` | none | anon-with-user-JWT | none | payload body.business_id | none | none | No | venue_photo_vault | none | `{ success: false, error: string }` |
| `DELETE` | `/app/api/venue/photo-vault` | none | anon-with-user-JWT | none | payload body.business_id | none | none | No | venue_photo_vault | none | `{ success: false, error: string }` |

---

## 2. Public Database Tables RLS & Access Matrix

Matrix compiled from all 54 migration files in `supabase/migrations/`.

| Table Name | RLS Enabled | Policies Count | Who Can SELECT | Who Can INSERT | Who Can UPDATE | Who Can DELETE | Routes Touching Table |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `businesses` | **YES** | 3 | Host / Staff / Authenticated | Service Role / Onboarding | Host Only | Host Only | `/api/host/profile`, `/api/guest/session` |
| `staff_profiles` | **YES** | 2 | Host / Self Staff | Host Only | Host Only | Host Only | `/api/host/staff/verify-pin`, `/api/host/expenses/staff` |
| `orders` | **YES** | 3 | Anon (Table orders) / Host / Staff | Anon (Guest) / Host | Host / Settlement RPC | Host Only | `/api/guest/order`, `/api/host/orders/*`, `/api/orders` |
| `order_items` | **YES** | 3 | Anon / Host / Staff | Anon / Host | Host / Kitchen Staff | Host Only | `/api/guest/order`, `/api/host/kitchen/tickets` |
| `dine_in_sessions` | **YES** | 4 | Anon / Host / Staff | Anon / Host | Anon (Bill req) / Host | Host Only | `/api/guest/session`, `/api/host/sessions` |
| `guest_wallets` | **YES** | 2 | Anon (by guest_id) / Host | **RPC Only** (No direct insert) | **RPC Only** (No direct update)| Blocked | `/api/guest/wallet`, `/api/host/wallet/*` |
| `wallet_transactions`| **YES** | 2 | Anon (by guest_id) / Host | **RPC Only** (Ledger) | Blocked (Immutable) | Blocked | `/api/guest/wallet`, `/api/host/wallet/*` |
| `wallet_redemptions` | **YES** | 4 | Anon (Own code) / Host | Anon (Generate code) | Host (Verify & Redeem) | Blocked | `/api/guest/wallet/redeem`, `/api/host/wallet/redeem` |
| `raw_inventory_items`| **YES** | 1 | Host / Kitchen Staff | Host Only | Host / Inventory Trigger | Host Only | `/api/host/inventory/*` |
| `inventory_logs` | **YES** | 1 | Host / Staff | **RPC / Trigger Only** | Blocked (Immutable) | Blocked | `/api/host/inventory/audit` |
| `kitchen_tickets` | **YES** | 2 | Anon / Host / Kitchen Staff | API Order Service / Host | Kitchen Staff (Status)| Host Only | `/api/host/kitchen/tickets`, `/api/guest/order` |
| `staff_notifications`| **YES** | 2 | Host / Kitchen Staff | Anon (Call staff) / Trigger | Host / Staff | Host Only | `/api/guest/call-staff` |
| `operational_expenses`| **YES** | 1 | Host Only | Host Only | Host Only | Host Only | `/api/host/expenses/*` |
| `restaurant_tables` | **YES** | 2 | Anon / Host / Staff | Host Only | Host Only | Host Only | `/api/tables`, `/api/host/tables` |
| `catalog_items` | **YES** | 2 | Anon / Host / Staff | Host Only | Host Only | Host Only | `/api/host/catalog/*`, `/api/guest/menu` |
| `recipe_ingredients`| **YES** | 2 | Host / Kitchen Staff | Host Only | Host Only | Host Only | `/api/host/catalog/recipe` |
| `room_categories` | **YES** | 2 | Anon / Host | Host Only | Host Only | Host Only | `/api/host/accommodations/categories` |
| `rooms` | **YES** | 2 | Anon / Host | Host Only | Host Only | Host Only | `/api/host/accommodations/rooms` |
| `room_stay_logs` | **YES** | 2 | Host Only | Host Only | Host Only | Host Only | `/api/host/accommodations/*` |
| `venue_reviews` | **YES** | 2 | Anon / Host | Anon (Submit review) | Host Only | Host Only | `/api/guest/reviews` |
| `venue_photo_vault` | **YES** | 2 | Anon / Host | Host Only | Host Only | Host Only | `/api/venue/photo-vault` |
| `venue_live_offers` | **YES** | 2 | Anon / Host | Host Only | Host Only | Host Only | `/api/venue/offers` |
| `venue_topup_requests`| **YES**| 2 | Host / Admin | Host (Submit UTR) | Admin Only | Admin Only | `/api/admin/topup-requests`, `/api/host/wallet` |
