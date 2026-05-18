const http = require('http');

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });

    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function testAPI() {
  console.log('=== API Connection Test ===\n');

  try {
    console.log('1. Testing products API...');
    const productsRes = await fetch('http://localhost:3001/api/products?limit=1');
    if (productsRes.status === 200) {
      const data = JSON.parse(productsRes.body);
      console.log(`   ✓ Products API working (${data.data.total} total products)\n`);
    } else {
      console.log(`   ✗ Products API failed (Status: ${productsRes.status})\n`);
    }

    console.log('2. Testing login API...');
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    if (loginRes.status === 200) {
      const data = JSON.parse(loginRes.body);
      if (data.success) {
        console.log(`   ✓ Login API working (User: ${data.data.user.username})\n`);
        console.log('=== All Tests Passed ===');
        console.log('API connection is working correctly!');
        process.exit(0);
      }
    }
    console.log(`   ✗ Login API failed (Status: ${loginRes.status})\n`);
    console.log('   Response:', loginRes.body);

  } catch (error) {
    console.error('❌ API connection error:', error.message);
    process.exit(1);
  }
}

testAPI();
