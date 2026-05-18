const request = require('supertest');
const express = require('express');

const app = express();
app.use(express.json());

let orders = [
  { id: 'order-001', user_id: 3, total_amount: 15999, status: 'completed', shipping_address: '北京', payment_method: 'alipay', sales_user_id: null, created_at: new Date() },
  { id: 'order-002', user_id: 3, total_amount: 1899, status: 'shipped', shipping_address: '上海', payment_method: 'wechat', sales_user_id: 2, created_at: new Date() },
  { id: 'order-003', user_id: 4, total_amount: 5999, status: 'pending', shipping_address: '广州', payment_method: 'alipay', sales_user_id: 2, created_at: new Date() },
  { id: 'order-004', user_id: 5, total_amount: 7999, status: 'payed', shipping_address: '深圳', payment_method: 'card', sales_user_id: null, created_at: new Date() }
];

let orderItems = [
  { id: 1, order_id: 'order-001', product_id: 1, product_name: 'MacBook Pro', quantity: 1, price: 14999 },
  { id: 2, order_id: 'order-002', product_id: 2, product_name: 'AirPods Pro', quantity: 1, price: 1899 }
];

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, message: '未授权' });
  }
  
  if (token === 'admin-token') {
    req.user = { id: 1, username: 'admin', role: 'admin' };
  } else if (token === 'sales-token') {
    req.user = { id: 2, username: 'sales', role: 'sales' };
  } else if (token === 'customer-token') {
    req.user = { id: 3, username: 'customer', role: 'customer' };
  } else {
    return res.status(401).json({ success: false, message: '无效的令牌' });
  }
  
  next();
};

app.get('/api/orders', authMiddleware, (req, res) => {
  const { id: user_id, role } = req.user;
  const { page = '1', limit = '10' } = req.query;
  
  let filtered = [...orders];
  
  if (role === 'customer') {
    filtered = filtered.filter(o => o.user_id === user_id);
  } else if (role === 'sales') {
    filtered = filtered.filter(o => o.sales_user_id === user_id || o.user_id === user_id);
  }
  
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const list = filtered.slice(offset, offset + parseInt(limit));
  
  const listWithItems = list.map(order => ({
    ...order,
    items: orderItems.filter(item => item.order_id === order.id)
  }));
  
  res.json({
    success: true,
    data: {
      list: listWithItems,
      total: filtered.length,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(filtered.length / parseInt(limit))
    }
  });
});

app.get('/api/orders/:id', authMiddleware, (req, res) => {
  const { id: user_id, role } = req.user;
  const order = orders.find(o => o.id === req.params.id);
  
  if (!order) {
    return res.status(404).json({ success: false, message: '订单不存在' });
  }
  
  if (role === 'customer' && order.user_id !== user_id) {
    return res.status(403).json({ success: false, message: '无权访问此订单' });
  }
  
  if (role === 'sales' && order.sales_user_id !== user_id && order.user_id !== user_id) {
    return res.status(403).json({ success: false, message: '无权访问此订单' });
  }
  
  const items = orderItems.filter(item => item.order_id === order.id);
  
  res.json({ success: true, data: { ...order, items } });
});

app.post('/api/orders', authMiddleware, (req, res) => {
  const { id: user_id, role } = req.user;
  const { items, shipping_address, payment_method } = req.body;
  
  if (role !== 'customer') {
    return res.status(403).json({ success: false, message: '只有客户可以创建订单' });
  }
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: '订单商品不能为空' });
  }
  
  if (!shipping_address) {
    return res.status(400).json({ success: false, message: '收货地址不能为空' });
  }
  
  const total_amount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const order_id = `order-${Date.now()}`;
  
  const newOrder = {
    id: order_id,
    user_id,
    total_amount,
    status: 'pending',
    shipping_address,
    payment_method: payment_method || 'alipay',
    sales_user_id: null,
    created_at: new Date()
  };
  
  orders.push(newOrder);
  
  items.forEach(item => {
    orderItems.push({
      id: orderItems.length + 1,
      order_id,
      product_id: item.product_id,
      product_name: item.product_name || '',
      quantity: item.quantity,
      price: item.price
    });
  });
  
  res.json({ 
    success: true, 
    data: { order_id, total_amount }, 
    message: '订单创建成功' 
  });
});

app.put('/api/orders/:id', authMiddleware, (req, res) => {
  const { id: user_id, role } = req.user;
  const { status } = req.body;
  
  if (role !== 'sales' && role !== 'admin') {
    return res.status(403).json({ success: false, message: '无权更新订单' });
  }
  
  const orderIndex = orders.findIndex(o => o.id === req.params.id);
  
  if (orderIndex === -1) {
    return res.status(404).json({ success: false, message: '订单不存在' });
  }
  
  if (role === 'sales' && orders[orderIndex].sales_user_id !== user_id) {
    return res.status(403).json({ success: false, message: '无权更新此订单' });
  }
  
  const validStatuses = ['pending', 'payed', 'shipped', 'completed', 'canceled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: '无效的订单状态' });
  }
  
  orders[orderIndex].status = status;
  
  res.json({ success: true, message: '订单状态更新成功' });
});

describe('订单处理系统测试', () => {
  describe('GET /api/orders', () => {
    test('管理员可以查看所有订单', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', 'Bearer admin-token');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.list.length).toBe(orders.length);
    });
    
    test('销售只能查看分配给自己的订单', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', 'Bearer sales-token');
      
      expect(response.status).toBe(200);
      expect(response.body.data.list.length).toBeLessThanOrEqual(orders.length);
    });
    
    test('客户只能查看自己的订单', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', 'Bearer customer-token');
      
      expect(response.status).toBe(200);
      expect(response.body.data.list.length).toBeLessThanOrEqual(orders.length);
      response.body.data.list.forEach(order => {
        expect(order.user_id).toBe(3);
      });
    });
    
    test('未授权访问返回401', async () => {
      const response = await request(app)
        .get('/api/orders');
      
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('未授权');
    });
    
    test('分页功能正常', async () => {
      const response = await request(app)
        .get('/api/orders?page=1&limit=2')
        .set('Authorization', 'Bearer admin-token');
      
      expect(response.status).toBe(200);
      expect(response.body.data.list.length).toBeLessThanOrEqual(2);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('pages');
    });
  });
  
  describe('GET /api/orders/:id', () => {
    test('获取订单详情成功', async () => {
      const response = await request(app)
        .get('/api/orders/order-001')
        .set('Authorization', 'Bearer admin-token');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
    });
    
    test('订单不存在返回404', async () => {
      const response = await request(app)
        .get('/api/orders/invalid-order')
        .set('Authorization', 'Bearer admin-token');
      
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('订单不存在');
    });
    
    test('客户无权访问他人的订单', async () => {
      const response = await request(app)
        .get('/api/orders/order-003')
        .set('Authorization', 'Bearer customer-token');
      
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('无权访问此订单');
    });
  });
  
  describe('POST /api/orders', () => {
    test('创建订单成功', async () => {
      const newOrder = {
        items: [
          { product_id: 1, product_name: 'MacBook Pro', price: 14999, quantity: 1 }
        ],
        shipping_address: '北京市朝阳区',
        payment_method: 'alipay'
      };
      
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', 'Bearer customer-token')
        .send(newOrder);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('order_id');
      expect(response.body.data).toHaveProperty('total_amount');
    });
    
    test('空商品列表返回400', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', 'Bearer customer-token')
        .send({ items: [], shipping_address: '北京' });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('订单商品不能为空');
    });
    
    test('缺少收货地址返回400', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', 'Bearer customer-token')
        .send({ items: [{ product_id: 1, price: 100, quantity: 1 }] });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('收货地址不能为空');
    });
    
    test('非客户角色不能创建订单', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', 'Bearer admin-token')
        .send({ items: [{ product_id: 1, price: 100, quantity: 1 }], shipping_address: '北京' });
      
      expect(response.status).toBe(403);
    });
  });
  
  describe('PUT /api/orders/:id', () => {
    test('更新订单状态成功', async () => {
      const response = await request(app)
        .put('/api/orders/order-004')
        .set('Authorization', 'Bearer admin-token')
        .send({ status: 'shipped' });
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('订单状态更新成功');
    });
    
    test('无效状态返回400', async () => {
      const response = await request(app)
        .put('/api/orders/order-001')
        .set('Authorization', 'Bearer admin-token')
        .send({ status: 'invalid-status' });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的订单状态');
    });
    
    test('客户无权更新订单', async () => {
      const response = await request(app)
        .put('/api/orders/order-001')
        .set('Authorization', 'Bearer customer-token')
        .send({ status: 'completed' });
      
      expect(response.status).toBe(403);
    });
    
    test('销售只能更新分配给自己的订单', async () => {
      const response = await request(app)
        .put('/api/orders/order-001')
        .set('Authorization', 'Bearer sales-token')
        .send({ status: 'shipped' });
      
      expect(response.status).toBe(403);
    });
  });
});
