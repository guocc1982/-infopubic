async function test() {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'password123' })
  });
  const loginData = await loginRes.json();
  console.log('Login:', loginRes.status, loginData);

  const res = await fetch('http://localhost:3000/api/comments', {
    headers: {
      'Authorization': 'Bearer ' + loginData.token,
      'X-Tenant-ID': 'default'
    }
  });
  console.log('Comments status:', res.status);
  const text = await res.text();
  console.log('Comments body:', text);
}
test().catch(console.error);
