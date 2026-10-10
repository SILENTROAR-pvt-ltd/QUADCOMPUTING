const fetch = require('node-fetch');

async function main() {
  try {
    const res = await fetch('http://localhost:3000/api/guest/menu?table=T-01&cafe_id=aed7ace0-d1b5-4525-b5c6-403ad6fcc269');
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
    return res;
  } catch (error) {
    console.error("Error fetching guest menu:", error);
    return null;
  }
}
main();
