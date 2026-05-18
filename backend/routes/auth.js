const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../middleware/response');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return errorResponse(res, '用户名和密码不能为空', 400);
    }
    
    const [rows] = await pool.query(
      'SELECT id, username, email, password, role FROM users WHERE username = ?',
      [username]
    );
    
    if (rows.length === 0) {
      return errorResponse(res, '用户名或密码错误', 401);
    }
    
    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) {
      await pool.query(
        'INSERT INTO login_logs (user_id, username, ip_address, user_agent, login_status) VALUES (?, ?, ?, ?, ?)',
        [user.id, user.username, req.ip, req.headers['user-agent'] || '', 'failed']
      );
      return errorResponse(res, '用户名或密码错误', 401);
    }
    
    const token = generateToken(user);
    
    await pool.query(
      'INSERT INTO login_logs (user_id, username, ip_address, user_agent, login_status) VALUES (?, ?, ?, ?, ?)',
      [user.id, user.username, req.ip, req.headers['user-agent'] || '', 'success']
    );
    
    await pool.query(
      'INSERT INTO operation_logs (user_id, username, operation, module, ip_address) VALUES (?, ?, ?, ?, ?)',
      [user.id, user.username, '用户登录', 'auth', req.ip]
    );
    
    return successResponse(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    }, '登录成功');
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    const validationErrors = validateRegistration({ username, email, password });
    if (validationErrors) {
      return errorResponse(res, validationErrors, 400);
    }
    
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    
    if (existingUsers.length > 0) {
      return errorResponse(res, '用户名或邮箱已存在', 400);
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, 'customer']
    );
    
    const user = { id: result.insertId, username, email, role: 'customer' };
    const token = generateToken(user);
    
    return successResponse(res, { token, user }, '注册成功');
  } catch (error) {
    console.error('Register error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    return successResponse(res, req.user, '查询成功');
  } catch (error) {
    console.error('Profile error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO operation_logs (user_id, username, operation, module, ip_address) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.user.username, '用户退出', 'auth', req.ip]
    );
    
    return successResponse(res, null, '退出成功');
  } catch (error) {
    console.error('Logout error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.post('/password/reset', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return errorResponse(res, '密码不能为空', 400);
    }
    
    const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return errorResponse(res, '用户不存在', 404);
    }
    
    const isValid = await bcrypt.compare(oldPassword, rows[0].password);
    if (!isValid) {
      return errorResponse(res, '旧密码错误', 401);
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);
    
    await pool.query(
      'INSERT INTO operation_logs (user_id, username, operation, module, ip_address) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.user.username, '修改密码', 'auth', req.ip]
    );
    
    return successResponse(res, null, '密码修改成功');
  } catch (error) {
    console.error('Reset password error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/login-logs', authenticateToken, async (req, res) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    const [rows] = await pool.query(
      'SELECT * FROM login_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [req.user.id, limitNum, offset]
    );
    
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM login_logs WHERE user_id = ?',
      [req.user.id]
    );
    
    return res.json({
      success: true,
      message: '查询成功',
      data: {
        list: rows,
        total: countResult[0].total,
        page: pageNum,
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('Get login logs error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

function validateRegistration({ username, email, password }) {
  const errors = [];
  if (!username || username.length < 3 || username.length > 50) {
    errors.push('用户名长度必须在3-50之间');
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push('邮箱格式不正确');
  }
  if (!password || password.length < 6) {
    errors.push('密码长度至少为6位');
  }
  return errors.length > 0 ? errors.join('；') : null;
}

module.exports = router;
