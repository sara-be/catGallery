const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function run() {
  // 1. Signup
  const signupData = JSON.stringify({ username: "testuser_" + Date.now(), email: "test" + Date.now() + "@example.com", password: "password123" });
  console.log("Signing up...");
  const signupRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/signup',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': signupData.length }
  }, signupData);
  console.log("Signup:", signupRes.statusCode, signupRes.body);

  // 2. Login
  const loginData = JSON.stringify({ username: JSON.parse(signupData).username, password: "password123" });
  console.log("Logging in...");
  const loginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
  }, loginData);
  console.log("Login:", loginRes.statusCode, loginRes.body);
  
  if (loginRes.statusCode !== 200) {
    console.error("Login failed");
    return;
  }

  // extract cookie
  const cookies = loginRes.headers['set-cookie'];
  if (!cookies) {
    console.error("No cookies set!");
    return;
  }
  console.log("Cookies:", cookies);
  const sessionCookie = cookies[0].split(';')[0];

  // 3. Check Auth
  console.log("Checking Auth...");
  const authRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/check-auth',
    method: 'GET',
    headers: { 'Cookie': sessionCookie }
  });
  console.log("Check Auth:", authRes.statusCode, authRes.body);

  // 4. Try Protected Route (Add Cat)
  const catData = JSON.stringify({ id: "testcat_" + Date.now(), tag: "Test Cat", img: "http://example.com/cat.jpg", description: "Test Description" });
  console.log("Adding Cat...");
  const catRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/cats',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': catData.length, 'Cookie': sessionCookie }
  }, catData);
  console.log("Add Cat:", catRes.statusCode, catRes.body);
}

run().catch(console.error);
