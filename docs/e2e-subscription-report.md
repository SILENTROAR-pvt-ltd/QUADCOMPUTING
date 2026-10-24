# Subscription plans: live stress test on Bombay Rasoi

Run E2ESUBMVLQ14QP · 2026-10-24T01:30:51.959Z · venue 189664b2…, put back afterwards

## What each plan unlocks, charges and shows

| Plan state | Unlocks | Bill fee | Guests see (events / offers / delivery / Vibey / room types) | Owner actions |
|---|---|---|---|---|
| You earn, we earn (₹3 a bill) | everything | ₹3 (₹50 → ₹47) | 4 / 1 / on / on / 4 | Publish a live event: ✓ · Create an offer: ✓ · Add a room: ✓ · Add a room type: ✓ · Desk room booking: ✓ |
| You earn, we earn (new id rhodium_ppb) | everything | ₹3 (₹50 → ₹47) | 4 / 1 / on / on / 4 | Publish a live event: ✓ · Create an offer: ✓ · Add a room: ✓ · Add a room type: ✓ · Desk room booking: ✓ |
| M¹-Pro free month | core | ₹0 (₹50 → ₹50) | 0 / 0 / off / off / 0 | Publish a live event: 🔒 · Create an offer: 🔒 · Add a room: 🔒 · Add a room type: 🔒 · Desk room booking: 🔒 |
| M¹-Pro paid | core | ₹0 (₹50 → ₹50) | 0 / 0 / off / off / 0 | Publish a live event: 🔒 · Create an offer: 🔒 · Add a room: 🔒 · Add a room type: 🔒 · Desk room booking: 🔒 |
| M¹-Pro + Vibey add-on | core, vibey | ₹0 (₹50 → ₹50) | 0 / 0 / off / on / 0 | Publish a live event: 🔒 · Create an offer: 🔒 · Add a room: 🔒 · Add a room type: 🔒 · Desk room booking: 🔒 |
| M¹-Pro, 10 days left | core | ₹0 (₹50 → ₹50) | 0 / 0 / off / off / 0 | Publish a live event: 🔒 · Create an offer: 🔒 · Add a room: 🔒 · Add a room type: 🔒 · Desk room booking: 🔒 |
| M²-Pro free month | core, events, offers, delivery, retention | ₹0 (₹50 → ₹50) | 4 / 1 / on / off / 0 | Publish a live event: ✓ · Create an offer: ✓ · Add a room: 🔒 · Add a room type: 🔒 · Desk room booking: 🔒 |
| M²-Pro paid | core, events, offers, delivery, retention | ₹0 (₹50 → ₹50) | 4 / 1 / on / off / 0 | Publish a live event: ✓ · Create an offer: ✓ · Add a room: 🔒 · Add a room type: 🔒 · Desk room booking: 🔒 |
| M²-Pro + Vibey add-on | core, events, offers, delivery, retention, vibey | ₹0 (₹50 → ₹50) | 4 / 1 / on / on / 0 | Publish a live event: ✓ · Create an offer: ✓ · Add a room: 🔒 · Add a room type: 🔒 · Desk room booking: 🔒 |
| Rhodium Pro yearly | everything | ₹0 (₹50 → ₹50) | 4 / 1 / on / on / 4 | Publish a live event: ✓ · Create an offer: ✓ · Add a room: ✓ · Add a room type: ✓ · Desk room booking: ✓ |
| M²-Pro ended 2 days ago (grace week) | core, events, offers, delivery, retention | ₹0 (₹50 → ₹50) | 4 / 1 / on / off / 0 | Publish a live event: ✓ · Create an offer: ✓ · Add a room: 🔒 · Add a room type: 🔒 · Desk room booking: 🔒 |
| M²-Pro ended 10 days ago | everything | ₹3 (₹50 → ₹47) | 4 / 1 / on / on / 4 | Publish a live event: ✓ · Create an offer: ✓ · Add a room: ✓ · Add a room type: ✓ · Desk room booking: ✓ |
| M¹-Pro free month over (no grace) | everything | ₹3 (₹50 → ₹47) | 4 / 1 / on / on / 4 | Publish a live event: ✓ · Create an offer: ✓ · Add a room: ✓ · Add a room type: ✓ · Desk room booking: ✓ |
| M¹-Pro, Vibey add-on lapsed | core | ₹0 (₹50 → ₹50) | 0 / 0 / off / off / 0 | Publish a live event: 🔒 · Create an offer: 🔒 · Add a room: 🔒 · Add a room type: 🔒 · Desk room booking: 🔒 |
| Earlier plan (12k_6m) running | everything | ₹0 (₹50 → ₹50) | 4 / 1 / on / on / 4 | Publish a live event: ✓ · Create an offer: ✓ · Add a room: ✓ · Add a room type: ✓ · Desk room booking: ✓ |

## Every check

| Result | Check | Detail |
|:---:|---|---|
| PASS | You earn, we earn (₹3 a bill): unlocks core, events, offers, delivery, retention, rooms, viber_connect, viber_club, vibey | got core, events, offers, delivery, retention, rooms, viber_connect, viber_club, vibey |
| PASS | You earn, we earn (₹3 a bill): dashboard phase payg | got payg |
| PASS | You earn, we earn (₹3 a bill): bill fee ₹3, charged once | cost ₹3, wallet ₹50 → ₹47 |
| PASS | You earn, we earn (₹3 a bill): guests see events 4, offers 1, delivery true, Vibey true, room types 4 | got {"events":4,"offers":1,"delivery":true,"vibey":true,"rooms":4} |
| PASS | You earn, we earn (₹3 a bill): owner's Vibey co-pilot available | planRequired false |
| PASS | You earn, we earn (₹3 a bill): Publish a live event allowed | HTTP 400 |
| PASS | You earn, we earn (₹3 a bill): Create an offer allowed | HTTP 400 |
| PASS | You earn, we earn (₹3 a bill): Add a room allowed | HTTP 400 |
| PASS | You earn, we earn (₹3 a bill): Add a room type allowed | HTTP 400 |
| PASS | You earn, we earn (₹3 a bill): Desk room booking allowed | HTTP 400 |
| PASS | You earn, we earn (new id rhodium_ppb): unlocks core, events, offers, delivery, retention, rooms, viber_connect, viber_club, vibey | got core, events, offers, delivery, retention, rooms, viber_connect, viber_club, vibey |
| PASS | You earn, we earn (new id rhodium_ppb): dashboard phase payg | got payg |
| PASS | You earn, we earn (new id rhodium_ppb): bill fee ₹3, charged once | cost ₹3, wallet ₹50 → ₹47 |
| PASS | You earn, we earn (new id rhodium_ppb): guests see events 4, offers 1, delivery true, Vibey true, room types 4 | got {"events":4,"offers":1,"delivery":true,"vibey":true,"rooms":4} |
| PASS | You earn, we earn (new id rhodium_ppb): owner's Vibey co-pilot available | planRequired false |
| PASS | You earn, we earn (new id rhodium_ppb): Publish a live event allowed | HTTP 400 |
| PASS | You earn, we earn (new id rhodium_ppb): Create an offer allowed | HTTP 400 |
| PASS | You earn, we earn (new id rhodium_ppb): Add a room allowed | HTTP 400 |
| PASS | You earn, we earn (new id rhodium_ppb): Add a room type allowed | HTTP 400 |
| PASS | You earn, we earn (new id rhodium_ppb): Desk room booking allowed | HTTP 400 |
| PASS | M¹-Pro free month: unlocks core | got core |
| PASS | M¹-Pro free month: dashboard phase active | got active |
| PASS | M¹-Pro free month: bill fee ₹0, charged once | cost ₹0, wallet ₹50 → ₹50 |
| PASS | M¹-Pro free month: guests see events 0, offers 0, delivery false, Vibey false, room types 0 | got {"events":0,"offers":0,"delivery":false,"vibey":false,"rooms":0} |
| PASS | M¹-Pro free month: owner's Vibey co-pilot locked | planRequired true |
| PASS | M¹-Pro free month: Publish a live event needs an upgrade (402) | HTTP 402 |
| PASS | M¹-Pro free month: Create an offer needs an upgrade (402) | HTTP 402 |
| PASS | M¹-Pro free month: Add a room needs an upgrade (402) | HTTP 402 |
| PASS | M¹-Pro free month: Add a room type needs an upgrade (402) | HTTP 402 |
| PASS | M¹-Pro free month: Desk room booking needs an upgrade (402) | HTTP 402 |
| PASS | M¹-Pro free month: Guest delivery order refused (402) | HTTP 402 |
| PASS | M¹-Pro free month: Guest room booking refused (402) | HTTP 402 |
| PASS | M¹-Pro free month: Guest joins an event list refused (402) | HTTP 402 |
| PASS | M¹-Pro free month: Guest redeems an offer refused (402) | HTTP 402 |
| PASS | M¹-Pro free month: Turn delivery on refused (402) | HTTP 402 |
| PASS | M¹-Pro paid: unlocks core | got core |
| PASS | M¹-Pro paid: dashboard phase active | got active |
| PASS | M¹-Pro paid: bill fee ₹0, charged once | cost ₹0, wallet ₹50 → ₹50 |
| PASS | M¹-Pro paid: guests see events 0, offers 0, delivery false, Vibey false, room types 0 | got {"events":0,"offers":0,"delivery":false,"vibey":false,"rooms":0} |
| PASS | M¹-Pro paid: owner's Vibey co-pilot locked | planRequired true |
| PASS | M¹-Pro paid: Publish a live event needs an upgrade (402) | HTTP 402 |
| PASS | M¹-Pro paid: Create an offer needs an upgrade (402) | HTTP 402 |
| PASS | M¹-Pro paid: Add a room needs an upgrade (402) | HTTP 402 |
| PASS | M¹-Pro paid: Add a room type needs an upgrade (402) | HTTP 402 |
| PASS | M¹-Pro paid: Desk room booking needs an upgrade (402) | HTTP 402 |
| PASS | M¹-Pro paid: Guest delivery order refused (402) | HTTP 402 |
| PASS | M¹-Pro paid: Guest room booking refused (402) | HTTP 402 |
| PASS | M¹-Pro paid: Guest joins an event list refused (402) | HTTP 402 |
| PASS | M¹-Pro paid: Guest redeems an offer refused (402) | HTTP 402 |
| PASS | M¹-Pro paid: Turn delivery on refused (402) | HTTP 402 |
| PASS | M¹-Pro + Vibey add-on: unlocks core, vibey | got core, vibey |
| PASS | M¹-Pro + Vibey add-on: dashboard phase active | got active |
| PASS | M¹-Pro + Vibey add-on: bill fee ₹0, charged once | cost ₹0, wallet ₹50 → ₹50 |
| PASS | M¹-Pro + Vibey add-on: guests see events 0, offers 0, delivery false, Vibey true, room types 0 | got {"events":0,"offers":0,"delivery":false,"vibey":true,"rooms":0} |
| PASS | M¹-Pro + Vibey add-on: owner's Vibey co-pilot available | planRequired false |
| PASS | M¹-Pro + Vibey add-on: Publish a live event needs an upgrade (402) | HTTP 402 |
| PASS | M¹-Pro + Vibey add-on: Create an offer needs an upgrade (402) | HTTP 402 |
| PASS | M¹-Pro + Vibey add-on: Add a room needs an upgrade (402) | HTTP 402 |
| PASS | M¹-Pro + Vibey add-on: Add a room type needs an upgrade (402) | HTTP 402 |
| PASS | M¹-Pro + Vibey add-on: Desk room booking needs an upgrade (402) | HTTP 402 |
| PASS | M¹-Pro + Vibey add-on: Guest delivery order refused (402) | HTTP 402 |
| PASS | M¹-Pro + Vibey add-on: Guest room booking refused (402) | HTTP 402 |
| PASS | M¹-Pro + Vibey add-on: Guest joins an event list refused (402) | HTTP 402 |
| PASS | M¹-Pro + Vibey add-on: Guest redeems an offer refused (402) | HTTP 402 |
| PASS | M¹-Pro + Vibey add-on: Turn delivery on refused (402) | HTTP 402 |
| PASS | M¹-Pro, 10 days left: unlocks core | got core |
| PASS | M¹-Pro, 10 days left: dashboard phase expiring | got expiring |
| PASS | M¹-Pro, 10 days left: bill fee ₹0, charged once | cost ₹0, wallet ₹50 → ₹50 |
| PASS | M¹-Pro, 10 days left: guests see events 0, offers 0, delivery false, Vibey false, room types 0 | got {"events":0,"offers":0,"delivery":false,"vibey":false,"rooms":0} |
| PASS | M¹-Pro, 10 days left: owner's Vibey co-pilot locked | planRequired true |
| PASS | M¹-Pro, 10 days left: Publish a live event needs an upgrade (402) | HTTP 402 |
| PASS | M¹-Pro, 10 days left: Create an offer needs an upgrade (402) | HTTP 402 |
| PASS | M¹-Pro, 10 days left: Add a room needs an upgrade (402) | HTTP 402 |
| PASS | M¹-Pro, 10 days left: Add a room type needs an upgrade (402) | HTTP 402 |
| PASS | M¹-Pro, 10 days left: Desk room booking needs an upgrade (402) | HTTP 402 |
| PASS | M¹-Pro, 10 days left: Guest delivery order refused (402) | HTTP 402 |
| PASS | M¹-Pro, 10 days left: Guest room booking refused (402) | HTTP 402 |
| PASS | M¹-Pro, 10 days left: Guest joins an event list refused (402) | HTTP 402 |
| PASS | M¹-Pro, 10 days left: Guest redeems an offer refused (402) | HTTP 402 |
| PASS | M¹-Pro, 10 days left: Turn delivery on refused (402) | HTTP 402 |
| PASS | M²-Pro free month: unlocks core, events, offers, delivery, retention | got core, events, offers, delivery, retention |
| PASS | M²-Pro free month: dashboard phase active | got active |
| PASS | M²-Pro free month: bill fee ₹0, charged once | cost ₹0, wallet ₹50 → ₹50 |
| PASS | M²-Pro free month: guests see events 4, offers 1, delivery true, Vibey false, room types 0 | got {"events":4,"offers":1,"delivery":true,"vibey":false,"rooms":0} |
| PASS | M²-Pro free month: owner's Vibey co-pilot locked | planRequired true |
| PASS | M²-Pro free month: Publish a live event allowed | HTTP 400 |
| PASS | M²-Pro free month: Create an offer allowed | HTTP 400 |
| PASS | M²-Pro free month: Add a room needs an upgrade (402) | HTTP 402 |
| PASS | M²-Pro free month: Add a room type needs an upgrade (402) | HTTP 402 |
| PASS | M²-Pro free month: Desk room booking needs an upgrade (402) | HTTP 402 |
| PASS | M²-Pro free month: Guest room booking refused (402) | HTTP 402 |
| PASS | M²-Pro paid: unlocks core, events, offers, delivery, retention | got core, events, offers, delivery, retention |
| PASS | M²-Pro paid: dashboard phase active | got active |
| PASS | M²-Pro paid: bill fee ₹0, charged once | cost ₹0, wallet ₹50 → ₹50 |
| PASS | M²-Pro paid: guests see events 4, offers 1, delivery true, Vibey false, room types 0 | got {"events":4,"offers":1,"delivery":true,"vibey":false,"rooms":0} |
| PASS | M²-Pro paid: owner's Vibey co-pilot locked | planRequired true |
| PASS | M²-Pro paid: Publish a live event allowed | HTTP 400 |
| PASS | M²-Pro paid: Create an offer allowed | HTTP 400 |
| PASS | M²-Pro paid: Add a room needs an upgrade (402) | HTTP 402 |
| PASS | M²-Pro paid: Add a room type needs an upgrade (402) | HTTP 402 |
| PASS | M²-Pro paid: Desk room booking needs an upgrade (402) | HTTP 402 |
| PASS | M²-Pro paid: Guest room booking refused (402) | HTTP 402 |
| PASS | M²-Pro + Vibey add-on: unlocks core, events, offers, delivery, retention, vibey | got core, events, offers, delivery, retention, vibey |
| PASS | M²-Pro + Vibey add-on: dashboard phase active | got active |
| PASS | M²-Pro + Vibey add-on: bill fee ₹0, charged once | cost ₹0, wallet ₹50 → ₹50 |
| PASS | M²-Pro + Vibey add-on: guests see events 4, offers 1, delivery true, Vibey true, room types 0 | got {"events":4,"offers":1,"delivery":true,"vibey":true,"rooms":0} |
| PASS | M²-Pro + Vibey add-on: owner's Vibey co-pilot available | planRequired false |
| PASS | M²-Pro + Vibey add-on: Publish a live event allowed | HTTP 400 |
| PASS | M²-Pro + Vibey add-on: Create an offer allowed | HTTP 400 |
| PASS | M²-Pro + Vibey add-on: Add a room needs an upgrade (402) | HTTP 402 |
| PASS | M²-Pro + Vibey add-on: Add a room type needs an upgrade (402) | HTTP 402 |
| PASS | M²-Pro + Vibey add-on: Desk room booking needs an upgrade (402) | HTTP 402 |
| PASS | M²-Pro + Vibey add-on: Guest room booking refused (402) | HTTP 402 |
| PASS | Rhodium Pro yearly: unlocks core, events, offers, delivery, retention, rooms, viber_connect, viber_club, vibey | got core, events, offers, delivery, retention, rooms, viber_connect, viber_club, vibey |
| PASS | Rhodium Pro yearly: dashboard phase active | got active |
| PASS | Rhodium Pro yearly: bill fee ₹0, charged once | cost ₹0, wallet ₹50 → ₹50 |
| PASS | Rhodium Pro yearly: guests see events 4, offers 1, delivery true, Vibey true, room types 4 | got {"events":4,"offers":1,"delivery":true,"vibey":true,"rooms":4} |
| PASS | Rhodium Pro yearly: owner's Vibey co-pilot available | planRequired false |
| PASS | Rhodium Pro yearly: Publish a live event allowed | HTTP 400 |
| PASS | Rhodium Pro yearly: Create an offer allowed | HTTP 400 |
| PASS | Rhodium Pro yearly: Add a room allowed | HTTP 400 |
| PASS | Rhodium Pro yearly: Add a room type allowed | HTTP 400 |
| PASS | Rhodium Pro yearly: Desk room booking allowed | HTTP 400 |
| PASS | M²-Pro ended 2 days ago (grace week): unlocks core, events, offers, delivery, retention | got core, events, offers, delivery, retention |
| PASS | M²-Pro ended 2 days ago (grace week): dashboard phase grace | got grace |
| PASS | M²-Pro ended 2 days ago (grace week): bill fee ₹0, charged once | cost ₹0, wallet ₹50 → ₹50 |
| PASS | M²-Pro ended 2 days ago (grace week): guests see events 4, offers 1, delivery true, Vibey false, room types 0 | got {"events":4,"offers":1,"delivery":true,"vibey":false,"rooms":0} |
| PASS | M²-Pro ended 2 days ago (grace week): owner's Vibey co-pilot locked | planRequired true |
| PASS | M²-Pro ended 2 days ago (grace week): Publish a live event allowed | HTTP 400 |
| PASS | M²-Pro ended 2 days ago (grace week): Create an offer allowed | HTTP 400 |
| PASS | M²-Pro ended 2 days ago (grace week): Add a room needs an upgrade (402) | HTTP 402 |
| PASS | M²-Pro ended 2 days ago (grace week): Add a room type needs an upgrade (402) | HTTP 402 |
| PASS | M²-Pro ended 2 days ago (grace week): Desk room booking needs an upgrade (402) | HTTP 402 |
| PASS | M²-Pro ended 2 days ago (grace week): Guest room booking refused (402) | HTTP 402 |
| PASS | M²-Pro ended 10 days ago: unlocks core, events, offers, delivery, retention, rooms, viber_connect, viber_club, vibey | got core, events, offers, delivery, retention, rooms, viber_connect, viber_club, vibey |
| PASS | M²-Pro ended 10 days ago: dashboard phase expired | got expired |
| PASS | M²-Pro ended 10 days ago: bill fee ₹3, charged once | cost ₹3, wallet ₹50 → ₹47 |
| PASS | M²-Pro ended 10 days ago: guests see events 4, offers 1, delivery true, Vibey true, room types 4 | got {"events":4,"offers":1,"delivery":true,"vibey":true,"rooms":4} |
| PASS | M²-Pro ended 10 days ago: owner's Vibey co-pilot available | planRequired false |
| PASS | M²-Pro ended 10 days ago: Publish a live event allowed | HTTP 400 |
| PASS | M²-Pro ended 10 days ago: Create an offer allowed | HTTP 400 |
| PASS | M²-Pro ended 10 days ago: Add a room allowed | HTTP 400 |
| PASS | M²-Pro ended 10 days ago: Add a room type allowed | HTTP 400 |
| PASS | M²-Pro ended 10 days ago: Desk room booking allowed | HTTP 400 |
| PASS | M¹-Pro free month over (no grace): unlocks core, events, offers, delivery, retention, rooms, viber_connect, viber_club, vibey | got core, events, offers, delivery, retention, rooms, viber_connect, viber_club, vibey |
| PASS | M¹-Pro free month over (no grace): dashboard phase expired | got expired |
| PASS | M¹-Pro free month over (no grace): bill fee ₹3, charged once | cost ₹3, wallet ₹50 → ₹47 |
| PASS | M¹-Pro free month over (no grace): guests see events 4, offers 1, delivery true, Vibey true, room types 4 | got {"events":4,"offers":1,"delivery":true,"vibey":true,"rooms":4} |
| PASS | M¹-Pro free month over (no grace): owner's Vibey co-pilot available | planRequired false |
| PASS | M¹-Pro free month over (no grace): Publish a live event allowed | HTTP 400 |
| PASS | M¹-Pro free month over (no grace): Create an offer allowed | HTTP 400 |
| PASS | M¹-Pro free month over (no grace): Add a room allowed | HTTP 400 |
| PASS | M¹-Pro free month over (no grace): Add a room type allowed | HTTP 400 |
| PASS | M¹-Pro free month over (no grace): Desk room booking allowed | HTTP 400 |
| PASS | M¹-Pro, Vibey add-on lapsed: unlocks core | got core |
| PASS | M¹-Pro, Vibey add-on lapsed: dashboard phase active | got active |
| PASS | M¹-Pro, Vibey add-on lapsed: bill fee ₹0, charged once | cost ₹0, wallet ₹50 → ₹50 |
| PASS | M¹-Pro, Vibey add-on lapsed: guests see events 0, offers 0, delivery false, Vibey false, room types 0 | got {"events":0,"offers":0,"delivery":false,"vibey":false,"rooms":0} |
| PASS | M¹-Pro, Vibey add-on lapsed: owner's Vibey co-pilot locked | planRequired true |
| PASS | M¹-Pro, Vibey add-on lapsed: Publish a live event needs an upgrade (402) | HTTP 402 |
| PASS | M¹-Pro, Vibey add-on lapsed: Create an offer needs an upgrade (402) | HTTP 402 |
| PASS | M¹-Pro, Vibey add-on lapsed: Add a room needs an upgrade (402) | HTTP 402 |
| PASS | M¹-Pro, Vibey add-on lapsed: Add a room type needs an upgrade (402) | HTTP 402 |
| PASS | M¹-Pro, Vibey add-on lapsed: Desk room booking needs an upgrade (402) | HTTP 402 |
| PASS | M¹-Pro, Vibey add-on lapsed: Guest delivery order refused (402) | HTTP 402 |
| PASS | M¹-Pro, Vibey add-on lapsed: Guest room booking refused (402) | HTTP 402 |
| PASS | M¹-Pro, Vibey add-on lapsed: Guest joins an event list refused (402) | HTTP 402 |
| PASS | M¹-Pro, Vibey add-on lapsed: Guest redeems an offer refused (402) | HTTP 402 |
| PASS | M¹-Pro, Vibey add-on lapsed: Turn delivery on refused (402) | HTTP 402 |
| PASS | Earlier plan (12k_6m) running: unlocks core, events, offers, delivery, retention, rooms, viber_connect, viber_club, vibey | got core, events, offers, delivery, retention, rooms, viber_connect, viber_club, vibey |
| PASS | Earlier plan (12k_6m) running: dashboard phase active | got active |
| PASS | Earlier plan (12k_6m) running: bill fee ₹0, charged once | cost ₹0, wallet ₹50 → ₹50 |
| PASS | Earlier plan (12k_6m) running: guests see events 4, offers 1, delivery true, Vibey true, room types 4 | got {"events":4,"offers":1,"delivery":true,"vibey":true,"rooms":4} |
| PASS | Earlier plan (12k_6m) running: owner's Vibey co-pilot available | planRequired false |
| PASS | Earlier plan (12k_6m) running: Publish a live event allowed | HTTP 400 |
| PASS | Earlier plan (12k_6m) running: Create an offer allowed | HTTP 400 |
| PASS | Earlier plan (12k_6m) running: Add a room allowed | HTTP 400 |
| PASS | Earlier plan (12k_6m) running: Add a room type allowed | HTTP 400 |
| PASS | Earlier plan (12k_6m) running: Desk room booking allowed | HTTP 400 |
| PASS | ₹1 in the wallet: bill still settles, ₹3 recorded as a due | due ₹3 |
| PASS | Vibey add-on refused on You earn, we earn (already included) | HTTP 409 |
| PASS | Vibey add-on refused on Rhodium (already included) | HTTP 409 |
| PASS | M²-Pro mid-term: buying the smaller M¹-Pro waits for renewal | HTTP 409 |
| PASS | First top-up of ₹599 only (no credit left) is refused |  |
| PASS | First top-up ₹1,099 → ₹599 setup + ₹500 credit | {"success":true,"venue_id":"189664b2-99e7-4d45-ac50-ffb647ef97df","setup_fee":599,"request_id":"4ff90271-9a26-4e92-a239-a2f35619a32a","new_balance":500,"plan_updated":false,"credited_amount":500,"plan_expires_at":null} |
| PASS | Second top-up ₹300 → all ₹300 is credit (setup paid once) |  |
| PASS | M²-Pro paid without the setup (₹14,999) is refused |  |
| PASS | M²-Pro ₹15,598 (with setup) → plan runs 12 months, wallet untouched | ends 2027-10-24T01:30:49.785216+00:00 |
| PASS | Early renewal of M²-Pro extends from its end date (no days lost) | ends 2028-02-01T01:30:49.196+00:00 |
| PASS | Vibey add-on ₹7,000 → Vibey for 12 months, plan stays M¹-Pro | vibey until 2027-10-24T01:30:50.941178+00:00 |
| PASS | Approving the same payment twice changes nothing |  |
| PASS | A second add-on stacks another year |  |
| PASS | M¹-Pro + add-on: Vibey on, events still locked |  |
| PASS | Venue put back exactly (plan row and wallet balance) | plan pay_as_you_go/active, wallet ₹0 |
| PASS | Test rows removed | 10 ledger lines, 1 dues, 6 payment requests |

**195 / 195 checks passed.**
