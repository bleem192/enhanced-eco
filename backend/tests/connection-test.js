const net = require('net');

const client = new net.Socket();
client.connect(3001, '127.0.0.1', () => {
  console.log('✓ Connected to server on port 3001');
  
  client.write('GET /api/products?limit=1 HTTP/1.1\r\nHost: localhost\r\n\r\n');
});

client.on('data', (data) => {
  console.log('Server response received');
  const response = data.toString();
  
  if (response.includes('200 OK') || response.includes('HTTP/1.1 200')) {
    console.log('✓ HTTP 200 OK - API is working!');
    
    const bodyStart = response.indexOf('{');
    if (bodyStart > -1) {
      const body = response.substring(bodyStart);
      try {
        const json = JSON.parse(body);
        console.log('✓ JSON parsed successfully');
        console.log('  Total products:', json.data?.total || 0);
      } catch (e) {
        console.log('Partial response:', body.substring(0, 200));
      }
    }
  } else {
    console.log('Response:', response.substring(0, 200));
  }
  
  client.destroy();
});

client.on('close', () => {
  console.log('\n✓ Connection test completed');
  process.exit(0);
});

client.on('error', (err) => {
  console.error('✗ Connection error:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.error('✗ Timeout - server not responding');
  client.destroy();
  process.exit(1);
}, 3000);
