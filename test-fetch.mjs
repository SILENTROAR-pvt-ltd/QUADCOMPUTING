async function main() {
  const res = await fetch('http://127.0.0.1:3000/api/guest/menu?table=T-01&cafe_id=aed7ace0-d1b5-4525-b5c6-403ad6fcc269');
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}
main();
