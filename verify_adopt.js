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
  const userSuffix = Date.now();
  const signupData = JSON.stringify({ username: "usr" + userSuffix, email: "usr" + userSuffix + "@test.com", password: "pwd" });
  
  console.log("1. Signup user:", signupData);
  let res = await request({
    hostname: 'localhost', port: 5000, path: '/signup', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': signupData.length }
  }, signupData);
  console.log("   Status:", res.statusCode, res.body);
  if(res.statusCode !== 200) return;

  console.log("2. Login:");
  const loginData = JSON.stringify({ username: "usr" + userSuffix, password: "pwd" });
  res = await request({
    hostname: 'localhost', port: 5000, path: '/login', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
  }, loginData);
  console.log("   Status:", res.statusCode);
  
  const cookies = res.headers['set-cookie'];
  if(!cookies) { console.error("No cookies!"); return; }
  const cookie = cookies[0].split(';')[0];

  console.log("3. Adopt Cat (id=1):");
  const adoptData = JSON.stringify({ catId: "1" });
  res = await request({
    hostname: 'localhost', port: 5000, path: '/adopt', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie, 'Content-Length': adoptData.length }
  }, adoptData);
  console.log("   Status:", res.statusCode, res.body);

  console.log("4. List Adopted:");
  res = await request({
    hostname: 'localhost', port: 5000, path: '/adopted', method: 'GET',
    headers: { 'Cookie': cookie }
  });
  console.log("   Status:", res.statusCode, res.body);
}

run().catch(console.error);
