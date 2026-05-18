// 测试 Sales 用户商品隔离功能
const request = require('supertest');

async function testProductIsolation() {
  console.log('\n=== 测试 Sales 用户商品隔离功能 ===\n');
  
  // 1. sales1 登录并创建商品
  console.log('1. 测试 sales 用户创建商品...');
  let loginRes = await request('http://localhost:3001')
    .post('/api/auth/login')
    .send({ username: 'sales', password: 'sales123' });
  
  console.log('   登录成功:', loginRes.body.success);
  const salesToken = loginRes.body.data.token;
  
  let createRes = await request('http://localhost:3001')
    .post('/api/products')
    .set('Authorization', `Bearer ${salesToken}`)
    .send({ name: 'Sales专属商品', category: '测试分类', price: 199 });
  
  console.log('   创建商品成功:', createRes.body.success);
  const productId = createRes.body.data.id;
  console.log('   创建的商品ID:', productId);
  
  // 2. 测试 sales 用户尝试修改不属于自己的商品
  console.log('\n2. 测试 sales 用户修改权限...');
  // 尝试修改商品ID为1的商品（假设不属于当前sales）
  let updateRes = await request('http://localhost:3001')
    .put('/api/products/1')
    .set('Authorization', `Bearer ${salesToken}`)
    .send({ price: 999 });
  
  console.log('   修改商品1的结果:', updateRes.body.message);
  
  // 3. 测试 admin 用户可以修改任意商品
  console.log('\n3. 测试 admin 用户修改权限...');
  loginRes = await request('http://localhost:3001')
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  
  console.log('   admin登录成功:', loginRes.body.success);
  const adminToken = loginRes.body.data.token;
  
  updateRes = await request('http://localhost:3001')
    .put('/api/products/1')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ price: 888 });
  
  console.log('   admin修改商品1的结果:', updateRes.body.message);
  
  // 4. 测试 sales 用户只能修改自己创建的商品
  console.log('\n4. 测试 sales 修改自己的商品...');
  updateRes = await request('http://localhost:3001')
    .put(`/api/products/${productId}`)
    .set('Authorization', `Bearer ${salesToken}`)
    .send({ price: 299 });
  
  console.log('   修改自己的商品结果:', updateRes.body.message);
  
  // 5. 测试价格修改权限
  console.log('\n5. 测试价格修改权限...');
  let priceRes = await request('http://localhost:3001')
    .put(`/api/products/1/price`)
    .set('Authorization', `Bearer ${salesToken}`)
    .send({ price: 500 });
  
  console.log('   sales修改商品1价格:', priceRes.body.message);
  
  priceRes = await request('http://localhost:3001')
    .put(`/api/products/${productId}/price`)
    .set('Authorization', `Bearer ${salesToken}`)
    .send({ price: 399 });
  
  console.log('   sales修改自己商品价格:', priceRes.body.message);
  
  // 6. 测试库存修改权限
  console.log('\n6. 测试库存修改权限...');
  let stockRes = await request('http://localhost:3001')
    .put(`/api/products/1/stock`)
    .set('Authorization', `Bearer ${salesToken}`)
    .send({ change_amount: 10, change_type: 'increase' });
  
  console.log('   sales修改商品1库存:', stockRes.body.message);
  
  stockRes = await request('http://localhost:3001')
    .put(`/api/products/${productId}/stock`)
    .set('Authorization', `Bearer ${salesToken}`)
    .send({ change_amount: 20, change_type: 'increase' });
  
  console.log('   sales修改自己商品库存:', stockRes.body.message);
  
  // 7. 测试删除权限
  console.log('\n7. 测试下架权限...');
  let deleteRes = await request('http://localhost:3001')
    .delete(`/api/products/1`)
    .set('Authorization', `Bearer ${salesToken}`);
  
  console.log('   sales下架商品1:', deleteRes.body.message);
  
  deleteRes = await request('http://localhost:3001')
    .delete(`/api/products/${productId}`)
    .set('Authorization', `Bearer ${salesToken}`);
  
  console.log('   sales下架自己的商品:', deleteRes.body.message);
  
  console.log('\n=== 测试完成 ===');
}

testProductIsolation().catch(err => {
  console.error('测试失败:', err.message);
});
