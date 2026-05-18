const http = require('http');

async function testAPIs() {
  console.log('=== 测试 API 接口 ===\n');
  
  // 1. 登录获取Token
  console.log('1. 登录获取Token...');
  const loginRes = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ username: 'admin', password: 'admin123' }));
  
  console.log('   登录状态:', loginRes.status);
  if (!loginRes.body.success) {
    console.log('   登录失败:', loginRes.body.message);
    return;
  }
  
  const token = loginRes.body.data.token;
  console.log('   登录成功\n');
  
  // 2. 测试销售趋势接口
  console.log('2. 测试销售趋势接口...');
  const trendRes = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/analysis/sales-trend?period=month',
    method: 'GET',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  console.log('   状态:', trendRes.status);
  if (trendRes.status === 500) {
    console.log('   ❌ 500错误:', trendRes.body);
  } else if (trendRes.body.success) {
    console.log('   ✅ 成功:', trendRes.body.data?.length || 0, '条记录');
  } else {
    console.log('   失败:', trendRes.body.message);
  }
  
  // 3. 测试推荐接口
  console.log('\n3. 测试推荐接口...');
  const recommendRes = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/analysis/recommendations',
    method: 'GET',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  console.log('   状态:', recommendRes.status);
  if (recommendRes.status === 403) {
    console.log('   ⚠️ 403权限拒绝（需要customer角色）');
  } else if (recommendRes.body.success) {
    console.log('   ✅ 成功:', recommendRes.body.data?.products?.length || 0, '个推荐商品');
  } else {
    console.log('   失败:', recommendRes.body.message);
  }
  
  console.log('\n=== 测试完成 ===');
}

function makeRequest(options, data = null) {
  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
    if (data) req.write(data);
    req.end();
  });
}

testAPIs();
