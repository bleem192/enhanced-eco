const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { successResponse, errorResponse, paginatedResponse } = require('../middleware/response');

const router = express.Router();

router.get('/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { page = '1', limit = '10' } = req.query;
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitNum;
    
    const [rows] = await pool.query(
      'SELECT id, username, email, role, status, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limitNum, offset]
    );
    
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM users');
    
    return paginatedResponse(res, rows, countResult[0].total, pageNum, limitNum);
  } catch (error) {
    console.error('Get users error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.post('/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { username, email, password, role = 'customer' } = req.body;
    
    const validationErrors = validateUser({ username, email, password });
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
      [username, email, hashedPassword, role]
    );
    
    await pool.query(
      'INSERT INTO operation_logs (user_id, username, operation, module, ip_address) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.user.username, `创建用户: ${username}`, 'admin', req.ip]
    );
    
    return successResponse(res, { id: result.insertId, username, email, role }, '用户创建成功');
  } catch (error) {
    console.error('Create user error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.put('/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, status } = req.body;
    
    if (parseInt(id) === req.user.id) {
      return errorResponse(res, '不能修改自己的信息', 400);
    }
    
    const [result] = await pool.query(
      'UPDATE users SET username = ?, email = ?, role = ?, status = ? WHERE id = ?',
      [username, email, role, status, id]
    );
    
    if (result.affectedRows === 0) {
      return errorResponse(res, '用户不存在', 404);
    }
    
    await pool.query(
      'INSERT INTO operation_logs (user_id, username, operation, module, ip_address) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.user.username, `更新用户: ${id}`, 'admin', req.ip]
    );
    
    return successResponse(res, null, '用户更新成功');
  } catch (error) {
    console.error('Update user error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.delete('/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (parseInt(id) === req.user.id) {
      return errorResponse(res, '不能删除自己', 400);
    }
    
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return errorResponse(res, '用户不存在', 404);
    }
    
    await pool.query(
      'INSERT INTO operation_logs (user_id, username, operation, module, ip_address) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.user.username, `删除用户: ${id}`, 'admin', req.ip]
    );
    
    return successResponse(res, null, '用户删除成功');
  } catch (error) {
    console.error('Delete user error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.post('/users/:id/reset-password', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return errorResponse(res, '密码长度至少为6位', 400);
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const [result] = await pool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, id]
    );
    
    if (result.affectedRows === 0) {
      return errorResponse(res, '用户不存在', 404);
    }
    
    await pool.query(
      'INSERT INTO operation_logs (user_id, username, operation, module, ip_address) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.user.username, `重置密码: ${id}`, 'admin', req.ip]
    );
    
    return successResponse(res, null, '密码重置成功');
  } catch (error) {
    console.error('Reset password error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/logs', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    const [rows] = await pool.query(
      'SELECT id, user_id, username, operation, module, ip_address, created_at FROM operation_logs ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limitNum, offset]
    );
    
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM operation_logs');
    
    return paginatedResponse(res, rows, countResult[0].total, pageNum, limitNum);
  } catch (error) {
    console.error('Get logs error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/sales-stats', authenticateToken, requireRole(['admin', 'sales']), async (req, res) => {
  try {
    const [overview] = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COUNT(*) as total_orders,
        COUNT(DISTINCT user_id) as unique_customers,
        COALESCE(AVG(total_amount), 0) as avg_order_value
      FROM orders 
      WHERE status IN ('payed', 'shipped', 'completed')
    `);
    
    const [categoryDist] = await pool.query(`
      SELECT p.category, COUNT(oi.id) as count, SUM(oi.quantity * oi.price) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status IN ('payed', 'shipped', 'completed')
      GROUP BY p.category
    `);
    
    return successResponse(res, {
      overview: overview[0],
      category_distribution: categoryDist
    }, '查询成功');
  } catch (error) {
    console.error('Get sales stats error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

function validateUser({ username, email, password }) {
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
