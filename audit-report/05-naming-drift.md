# 05 Naming Drift

This report catalogs the various names used for identical concepts across the codebase.

## tenant id
- **cafe_id**: 158 occurrences
- **business_id**: 452 occurrences
- **venueId**: 229 occurrences
- **venue_id**: 160 occurrences
- **businessId**: 533 occurrences
- **location_id**: 21 occurrences
- **branchId**: 28 occurrences

## table
- **table_number**: 334 occurrences
- **table**: 383 occurrences
- **tableParam**: 28 occurrences
- **tableNo**: 17 occurrences
- **table_id**: 56 occurrences

## order total
- **grand_total**: 113 occurrences
- **total_amount**: 37 occurrences
- **grandTotal**: 98 occurrences
- **total_item_price**: 12 occurrences

## guest identity
- **session_id**: 89 occurrences
- **customer_id**: 17 occurrences
- **guest_id**: 72 occurrences
- **guest_handle**: 74 occurrences
- **handle**: 63 occurrences
- **customer_phone**: 31 occurrences
- **quad_guest_wallet_id**: 8 occurrences
- **guest_session_id**: 18 occurrences

## item
- **name**: 755 occurrences
- **id**: 1514 occurrences
- **catalog_item_id**: 39 occurrences
- **item_id**: 37 occurrences

## qty
- **qty**: 125 occurrences
- **quantity**: 141 occurrences

## status
- **state**: 274 occurrences
- **status**: 1023 occurrences
- **kot_status**: 27 occurrences

## payment_method
- **payment_method**: 40 occurrences
- **paymentMethod**: 47 occurrences

## KOT
- **ticket**: 113 occurrences
- **kot**: 6 occurrences

## wallet
- **wallet**: 381 occurrences
- **venue_wallets**: 17 occurrences
- **guest_wallets**: 3 occurrences

## settled
- **SETTLED**: 36 occurrences
- **billed**: 20 occurrences
- **settled**: 68 occurrences
- **paid**: 14 occurrences
- **completed**: 37 occurrences
- **closed**: 19 occurrences

## LocalStorage / SessionStorage Keys
| Key | Written By | Read By | Potential PII? |
|---|---|---|---|
| guest_handle | components/guest/lobby/LobbyUsernameModal.tsx:38 | app/guest/lobby/page.tsx:52 | No |
| quad_customer_id | app/guest/onboard/page.tsx:104 | components/guest/menu/hooks/guest-storage.util.ts:24 | No |
| quad_guest_uuid | app/guest/onboard/page.tsx:105 | None | No |
| quad_table_number | app/guest/onboard/page.tsx:106 | None | No |
| quad_cafe_id | app/guest/onboard/page.tsx:107 | None | No |
| quad_guest_name | app/guest/onboard/page.tsx:108 | components/guest/lobby/useGuestWallet.ts:23 | Yes |
| quad-provisioning | app/onboarding/host/page.tsx:98 | app/host/dashboard/page.tsx:26 | No |
| guest_name | components/guest/lobby/LobbyUsernameModal.tsx:39 | None | Yes |
| quad_guest_wallet_id | components/guest/lobby/LobbyUsernameModal.tsx:40 | components/guest/lobby/useGuestWallet.ts:25 | No |
| quad_guest_phone | components/guest/menu/guest-identity.util.ts:33 | components/guest/lobby/useGuestWallet.ts:22 | Yes |
| guest_avatar | components/guest/menu/guest-identity.util.ts:34 | components/guest/menu/CartReviewModal.tsx:72 | No |
| quad_guest_uuid_${normC}_${normT} | None | components/guest/menu/hooks/guest-storage.util.ts:41 | No |
| master_admin_unlocked | components/host/control-center/useControlCenterSecurity.ts:75 | components/host/control-center/useControlCenterSecurity.ts:51 | No |
| quad_wallet_${venueId} | components/host/wallet/hooks/useWalletWorkspace.ts:37 | components/host/wallet/hooks/useWalletWorkspace.ts:8 | No |
| quad_preloaded_invoice | components/host/workspaces/accommodations/occupied/useOccupiedRoomDossier.ts:152 | components/host/workspaces/billing/hooks/usePOSCart.ts:99 | No |
| quad_preloaded_order_id | components/host/workspaces/accommodations/occupied/useOccupiedRoomDossier.ts:153 | None | No |
| pos_catalog_cache | components/host/workspaces/billing/hooks/usePOSCatalog.ts:125 | components/host/workspaces/billing/hooks/usePOSCatalog.ts:93 | No |
| pos_tables_cache | components/host/workspaces/billing/hooks/usePOSTables.ts:132 | components/host/workspaces/billing/hooks/usePOSTables.ts:44 | No |
| quad_kot_${key} | components/host/workspaces/kitchen/hooks/kitchen-cache.util.ts:29 | components/host/workspaces/kitchen/hooks/kitchen-cache.util.ts:11 | No |
| quad_guest_cart | lib/store/cart.store.ts:65 | lib/store/cart.store.ts:51 | No |
