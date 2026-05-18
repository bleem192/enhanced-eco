const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
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
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log('\n=== 测试 Sales 用户商品隔离功能 ===\n');
  
  // 1. 登录 sales 用户
  console.log('1. 登录 sales 用户...');
  const loginRes = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ username: 'sales', password: 'sales123' }));
  
  console.log('   状态码:', loginRes.status);
  if (!loginRes.body.success) {
    console.log('   登录失败:', loginRes.body.message);
    return;
  }
  
  const token = loginRes.body.data.token;
  console.log('   登录成功，获取Token');
  
  // 2. 创建商品
  console.log('\n2. 创建商品...');
  const createRes = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/products',
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, JSON.stringify({ name: 'Sales专属测试商品', category: '测试', price: 199 }));
  
  console.log('   状态码:', createRes.status);
  console.log('   结果:', createRes.body.message);
  const productId = createRes.body.data?.id;
  console.log('   商品ID:', productId);
  
  // 3. 尝试修改不属于自己的商品（商品ID=1）
  console.log('\n3. 尝试修改商品ID=1（不属于自己）...');
  const updateRes = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/products/1',
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, JSON.stringify({ price: 999 }));
  
  console.log('   状态码:', updateRes.status);
  console.log('   结果:', updateRes.body.message);
  
  // 4. 尝试修改自己创建的商品
  if (productId) {
    console.log('\n4. 修改自己创建的商品...');
    const updateOwnRes = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: `/api/products/${productId}`,
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, JSON.stringify({ price: 299 }));
    
    console.log('   状态码:', updateOwnRes.status);
    console.log('   结果:', updateOwnRes.body.message);
  }
  
  // 5. 测试价格修改权限
  console.log('\n5. 尝试修改商品ID=1的价格...');
  const priceRes = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/products/1/price',
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, JSON.stringify({ price: 500 }));
  
  console.log('   状态码:', priceRes.status);
  console.log('   结果:', priceRes.body.message);
  
  // 6. 测试下架权限
  console.log('\n6. 尝试下架商品ID=1...');
  const deleteRes = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/products/1',
    method: 'DELETE',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  console.log('   状态码:', deleteRes.status);
  console.log('   结果:', deleteRes.body.message);
  
  // 7. 测试管理员可以修改所有商品
  console.log('\n7. 测试管理员权限...');
  const adminLogin = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ username: 'admin', password: 'admin123' }));
  
  const adminToken = adminLogin.body.data.token;
  
  const adminUpdate = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/products/1',
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    }
  }, JSON.stringify({ price: 888 }));
  
  console.log('   管理员修改商品ID=1');
  console.log('   状态码:', adminUpdate.status);
  console.log('   结果:', adminUpdate.body.message);
  
  console.log('\n=== 测试完成 ===');
}

main().catch(err => console.error('测试失败:', err));
