async function test() {
  const res = await fetch('http://localhost:3000/management/api/employees', {
    method: 'GET'
  });
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text);
}
test();
