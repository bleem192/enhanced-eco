const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-secret-key-change-in-production';

const app = express();
app.use(express.json());

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: '用户名和密码不能为空' 
    });
  }
  
  if (username === 'admin' && password === 'admin123') {
    const token = jwt.sign(
      { id: 1, username: 'admin', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    return res.json({
      success: true,
      data: {
        token,
        user: { id: 1, username: 'admin', role: 'admin' }
      }
    });
  }
  
  if (username === 'sales' && password === 'sales123') {
    const token = jwt.sign(
      { id: 2, username: 'sales', role: 'sales' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    return res.json({
      success: true,
      data: {
        token,
        user: { id: 2, username: 'sales', role: 'sales' }
      }
    });
  }
  
  if (username === 'customer' && password === 'customer123') {
    const token = jwt.sign(
      { id: 3, username: 'customer', role: 'customer' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    return res.json({
      success: true,
      data: {
        token,
        user: { id: 3, username: 'customer', role: 'customer' }
      }
    });
  }
  
  return res.status(401).json({ 
    success: false, 
    message: '用户名或密码错误' 
  });
});

app.post('/api/auth/register', async (req, res) => {
  const { username, password, email } = req.body;
  
  if (!username || !password || !email) {
    return res.status(400).json({ 
      success: false, 
      message: '所有字段都不能为空' 
    });
  }
  
  if (username.length < 3) {
    return res.status(400).json({ 
      success: false, 
      message: '用户名至少需要3个字符' 
    });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ 
      success: false, 
      message: '密码至少需要6个字符' 
    });
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false, 
      message: '邮箱格式不正确' 
    });
  }
  
  return res.json({
    success: true,
    data: { id: 4, username, email, role: 'customer' },
    message: '注册成功'
  });
});

describe('认证系统测试', () => {
  describe('POST /api/auth/login', () => {
    test('管理员登录成功', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('username', 'admin');
      expect(response.body.data.user).toHaveProperty('role', 'admin');
    });
    
    test('销售用户登录成功', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'sales', password: 'sales123' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('role', 'sales');
    });
    
    test('普通用户登录成功', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'customer', password: 'customer123' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('role', 'customer');
    });
    
    test('用户名错误返回401', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'wronguser', password: 'admin123' });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('用户名或密码错误');
    });
    
    test('密码错误返回401', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrongpassword' });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
    
    test('空用户名返回400', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: '', password: 'admin123' });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('用户名和密码不能为空');
    });
    
    test('空密码返回400', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: '' });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('用户名和密码不能为空');
    });
    
    test('JWT Token格式正确', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });
      
      const token = response.body.data.token;
      const decoded = jwt.verify(token, JWT_SECRET);
      
      expect(decoded).toHaveProperty('id');
      expect(decoded).toHaveProperty('username');
      expect(decoded).toHaveProperty('role');
      expect(decoded.role).toBe('admin');
    });
  });
  
  describe('POST /api/auth/register', () => {
    test('注册成功', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ 
          username: 'newuser', 
          password: 'password123', 
          email: 'newuser@test.com' 
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('username', 'newuser');
      expect(response.body.data).toHaveProperty('role', 'customer');
    });
    
    test('用户名太短返回400', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ 
          username: 'ab', 
          password: 'password123', 
          email: 'test@test.com' 
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('至少需要3个字符');
    });
    
    test('密码太短返回400', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ 
          username: 'newuser', 
          password: '12345', 
          email: 'test@test.com' 
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('至少需要6个字符');
    });
    
    test('邮箱格式错误返回400', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ 
          username: 'newuser', 
          password: 'password123', 
          email: 'invalid-email' 
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('邮箱格式不正确');
    });
    
    test('缺少字段返回400', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'newuser' });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('所有字段都不能为空');
    });
  });
});
