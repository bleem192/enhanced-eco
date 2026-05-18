const http = require('http');
require('dotenv').config();

async function main() {
  // 登录
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  
  const loginData = await loginRes.json();
  console.log('Login:', loginData.success ? 'Success' : 'Failed');
  
  if (!loginData.success) return;
  
  const token = loginData.data.token;
  
  // 测试销售趋势
  const trendRes = await fetch('http://localhost:3001/api/analysis/sales-trend?period=month', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  console.log('Sales Trend Status:', trendRes.status);
  const trendData = await trendRes.json();
  console.log('Sales Trend Response:', JSON.stringify(trendData));
}

main().catch(e => console.error('Error:', e));
