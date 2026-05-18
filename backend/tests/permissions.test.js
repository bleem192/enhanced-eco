const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-secret-key-change-in-production';

const app = express();
app.use(express.json());

const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, message: '未授权' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: '无效的令牌' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: '权限不足' });
    }
    
    next();
  };
};

let users = [
  { id: 1, username: 'admin', password: 'admin123', role: 'admin', status: 'active' },
  { id: 2, username: 'sales', password: 'sales123', role: 'sales', status: 'active' },
  { id: 3, username: 'customer', password: 'customer123', role: 'customer', status: 'active' },
  { id: 4, username: 'inactive', password: 'test123', role: 'customer', status: 'inactive' }
];

app.post('/api/admin/users', authenticateToken, requireRole(['admin']), (req, res) => {
  const { username, password, email, role } = req.body;
  
  if (!username || !password || !email) {
    return res.status(400).json({ success: false, message: '所有字段都不能为空' });
  }
  
  const newUser = {
    id: users.length + 1,
    username,
    password,
    email,
    role: role || 'customer',
    status: 'active'
  };
  
  users.push(newUser);
  
  res.json({ success: true, data: { id: newUser.id }, message: '用户创建成功' });
});

app.put('/api/admin/users/:id', authenticateToken, requireRole(['admin']), (req, res) => {
  const userIndex = users.findIndex(u => u.id === parseInt(req.params.id));
  
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }
  
  const { status, role } = req.body;
  
  if (status) {
    users[userIndex].status = status;
  }
  
  if (role) {
    users[userIndex].role = role;
  }
  
  res.json({ success: true, message: '用户更新成功' });
});

app.post('/api/admin/users/:id/reset-password', authenticateToken, requireRole(['admin']), (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  
  if (!user) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }
  
  res.json({ success: true, message: '密码重置成功' });
});

app.delete('/api/admin/users/:id', authenticateToken, requireRole(['admin']), (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  
  if (!user) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }
  
  user.status = 'inactive';
  
  res.json({ success: true, message: '用户删除成功' });
});

app.post('/api/products', authenticateToken, requireRole(['sales', 'admin']), (req, res) => {
  res.json({ success: true, message: '商品创建成功' });
});

app.delete('/api/products/:id', authenticateToken, requireRole(['sales', 'admin']), (req, res) => {
  res.json({ success: true, message: '商品下架成功' });
});

app.get('/api/admin/sales-stats', authenticateToken, requireRole(['admin']), (req, res) => {
  res.json({ success: true, data: { total_sales: 100000 } });
});

describe('用户权限系统测试', () => {
  describe('角色权限验证', () => {
    test('Admin可以创建用户', async () => {
      const token = jwt.sign({ id: 1, username: 'admin', role: 'admin' }, JWT_SECRET);
      
      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          username: 'newuser',
          password: 'password123',
          email: 'new@test.com',
          role: 'customer'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    test('Sales不能创建用户', async () => {
      const token = jwt.sign({ id: 2, username: 'sales', role: 'sales' }, JWT_SECRET);
      
      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          username: 'newuser',
          password: 'password123',
          email: 'new@test.com'
        });
      
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('权限不足');
    });
    
    test('Customer不能创建用户', async () => {
      const token = jwt.sign({ id: 3, username: 'customer', role: 'customer' }, JWT_SECRET);
      
      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          username: 'newuser',
          password: 'password123',
          email: 'new@test.com'
        });
      
      expect(response.status).toBe(403);
    });
    
    test('未授权用户不能访问管理接口', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .send({
          username: 'newuser',
          password: 'password123',
          email: 'new@test.com'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('未授权');
    });
    
    test('无效的Token被拒绝', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          username: 'newuser',
          password: 'password123',
          email: 'new@test.com'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('无效的令牌');
    });
  });
  
  describe('用户管理权限', () => {
    test('Admin可以更新用户', async () => {
      const token = jwt.sign({ id: 1, username: 'admin', role: 'admin' }, JWT_SECRET);
      
      const response = await request(app)
        .put('/api/admin/users/3')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'inactive' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    test('Admin可以重置用户密码', async () => {
      const token = jwt.sign({ id: 1, username: 'admin', role: 'admin' }, JWT_SECRET);
      
      const response = await request(app)
        .post('/api/admin/users/3/reset-password')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('密码重置成功');
    });
    
    test('Admin可以删除用户（软删除）', async () => {
      const token = jwt.sign({ id: 1, username: 'admin', role: 'admin' }, JWT_SECRET);
      
      const response = await request(app)
        .delete('/api/admin/users/4')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('用户删除成功');
    });
    
    test('删除不存在的用户返回404', async () => {
      const token = jwt.sign({ id: 1, username: 'admin', role: 'admin' }, JWT_SECRET);
      
      const response = await request(app)
        .delete('/api/admin/users/999')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('商品管理权限', () => {
    test('Admin可以创建商品', async () => {
      const token = jwt.sign({ id: 1, username: 'admin', role: 'admin' }, JWT_SECRET);
      
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Product',
          category: 'Test',
          price: 99.99
        });
      
      expect(response.status).toBe(200);
    });
    
    test('Sales可以创建商品', async () => {
      const token = jwt.sign({ id: 2, username: 'sales', role: 'sales' }, JWT_SECRET);
      
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Product',
          category: 'Test',
          price: 99.99
        });
      
      expect(response.status).toBe(200);
    });
    
    test('Customer不能创建商品', async () => {
      const token = jwt.sign({ id: 3, username: 'customer', role: 'customer' }, JWT_SECRET);
      
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Product',
          category: 'Test',
          price: 99.99
        });
      
      expect(response.status).toBe(403);
    });
    
    test('Admin可以下架商品', async () => {
      const token = jwt.sign({ id: 1, username: 'admin', role: 'admin' }, JWT_SECRET);
      
      const response = await request(app)
        .delete('/api/products/1')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
    });
    
    test('Sales可以下架商品', async () => {
      const token = jwt.sign({ id: 2, username: 'sales', role: 'sales' }, JWT_SECRET);
      
      const response = await request(app)
        .delete('/api/products/1')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
    });
  });
  
  describe('数据统计权限', () => {
    test('Admin可以查看销售统计', async () => {
      const token = jwt.sign({ id: 1, username: 'admin', role: 'admin' }, JWT_SECRET);
      
      const response = await request(app)
        .get('/api/admin/sales-stats')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('total_sales');
    });
    
    test('Sales不能查看销售统计', async () => {
      const token = jwt.sign({ id: 2, username: 'sales', role: 'sales' }, JWT_SECRET);
      
      const response = await request(app)
        .get('/api/admin/sales-stats')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(403);
    });
    
    test('Customer不能查看销售统计', async () => {
      const token = jwt.sign({ id: 3, username: 'customer', role: 'customer' }, JWT_SECRET);
      
      const response = await request(app)
        .get('/api/admin/sales-stats')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(403);
    });
  });
  
  describe('JWT Token验证', () => {
    test('Token包含正确的用户信息', () => {
      const token = jwt.sign(
        { id: 1, username: 'admin', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      const decoded = jwt.verify(token, JWT_SECRET);
      
      expect(decoded.id).toBe(1);
      expect(decoded.username).toBe('admin');
      expect(decoded.role).toBe('admin');
    });
    
    test('过期的Token被拒绝', async () => {
      const token = jwt.sign(
        { id: 1, username: 'admin', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '-1s' }
      );
      
      const response = await request(app)
        .get('/api/admin/sales-stats')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(401);
    });
    
    test('使用错误密钥签名的Token被拒绝', async () => {
      const token = jwt.sign(
        { id: 1, username: 'admin', role: 'admin' },
        'wrong-secret',
        { expiresIn: '7d' }
      );
      
      const response = await request(app)
        .get('/api/admin/sales-stats')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(401);
    });
  });
});
