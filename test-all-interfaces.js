/**
 * QUAD COMPUTING OS — ALL INTERFACES & ROUTES AUDIT
 * Tests every single localhost interface across Guest, Host, Control Center, Admin, and API.
 */

const BASE_URL = 'http://127.0.0.1:3000';
const CAFE_ID = 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';

const INTERFACES = [
  { name: 'Root Landing / Welcome', url: `${BASE_URL}/` },
  { name: 'Guest Social Lobby & Floorplan', url: `${BASE_URL}/guest/lobby?table=T-08&cafe_id=${CAFE_ID}` },
  { name: 'Guest Food & Drinks Menu', url: `${BASE_URL}/menu?table=T-08&cafe_id=${CAFE_ID}` },
  { name: 'Guest Onboarding Screen', url: `${BASE_URL}/onboarding/guest?cafe_id=${CAFE_ID}` },
  { name: 'Host Authentication Screen', url: `${BASE_URL}/auth/host` },
  { name: 'Host Onboarding Setup', url: `${BASE_URL}/onboarding/host` },
  { name: 'Host Property Dashboard', url: `${BASE_URL}/host/dashboard` },
  { name: 'Control Center: Profile Tab', url: `${BASE_URL}/host/control-center?tab=profile` },
  { name: 'Control Center: Subscription & Wallet', url: `${BASE_URL}/host/control-center?tab=wallet` },
  { name: 'Control Center: Analytics & COGS', url: `${BASE_URL}/host/control-center?tab=dashboard` },
  { name: 'Control Center: Menu Catalog', url: `${BASE_URL}/host/control-center?tab=catalog` },
  { name: 'Control Center: Billing & Tables', url: `${BASE_URL}/host/control-center?tab=billing` },
  { name: 'Control Center: Accommodations', url: `${BASE_URL}/host/control-center?tab=accommodations` },
  { name: 'Control Center: Live Kitchen (KOT)', url: `${BASE_URL}/host/control-center?tab=kitchen` },
  { name: 'Control Center: Raw Inventory', url: `${BASE_URL}/host/control-center?tab=inventory` },
  { name: 'Control Center: Staff & Expenses', url: `${BASE_URL}/host/control-center?tab=expenses` },
  { name: 'API: Host Wallet Endpoint', url: `${BASE_URL}/api/host/wallet?venue_id=${CAFE_ID}` },
  { name: 'API: Host Outstanding Dues', url: `${BASE_URL}/api/host/wallet/outstanding?venue_id=${CAFE_ID}` },
  { name: 'API: Admin Top-Up Requests', url: `${BASE_URL}/api/admin/topup-requests` },
  { name: 'Dedicated Admin Top-Up Desk UI', url: `${BASE_URL}/admin/topup-desk` },
  { name: 'API: Venue Live Offers', url: `${BASE_URL}/api/venue/offers?venue_id=${CAFE_ID}` },
  { name: 'API: Guest Wallet Endpoint', url: `${BASE_URL}/api/guest/wallet?guest_id=@test_guest&business_id=${CAFE_ID}` },
  { name: 'API: Guest Reviews Endpoint', url: `${BASE_URL}/api/guest/reviews?business_id=${CAFE_ID}` },
];

async function testAllInterfaces() {
  console.log('\n========================================================');
  console.log(' 🌐 VERIFYING EVERY LOCALHOST INTERFACE & WORKSPACE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  for (const item of INTERFACES) {
    const start = Date.now();
    try {
      const res = await fetch(item.url);
      const latency = Date.now() - start;
      if (res.status >= 200 && res.status < 400) {
        console.log(` [HTTP ${res.status}] ✅ ${item.name.padEnd(38)} (${latency}ms)`);
        passed++;
      } else {
        console.log(` [HTTP ${res.status}] ⚠️ ${item.name.padEnd(38)} (${latency}ms)`);
        failed++;
      }
    } catch (err) {
      console.log(` [ERROR]    ❌ ${item.name.padEnd(38)}: ${err.message}`);
      failed++;
    }
  }

  console.log('\n========================================================');
  console.log(` 📊 INTERFACES AUDIT SUMMARY: ${passed}/${INTERFACES.length} Online`);
  if (failed === 0) {
    console.log(' 🟢 STATUS: EVERY LOCALHOST INTERFACE IS 100% OPERATIONAL');
  } else {
    console.log(` 🟡 STATUS: ${failed} INTERFACE(S) RETURNED UNEXPECTED CODE`);
  }
  console.log('========================================================\n');
}

testAllInterfaces();
