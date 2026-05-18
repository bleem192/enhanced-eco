const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { successResponse, errorResponse, paginatedResponse } = require('../middleware/response');

const router = express.Router();

router.get('/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { page = '1', limit = '10', role } = req.query;
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitNum;
    
    let whereClause = '';
    let params = [];
    
    if (role) {
      whereClause = 'WHERE role = ?';
      params.push(role);
    }
    
    const [rows] = await pool.query(
      'SELECT id, username, email, role, status, created_at FROM users ' + whereClause + ' ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [...params, limitNum, offset]
    );
    
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM users ' + whereClause,
      params
    );
    
    return paginatedResponse(res, rows, countResult[0].total, pageNum, limitNum);
  } catch (error) {
    console.error('Get users error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/sales-performance', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const [salesUsers] = await pool.query(`
      SELECT u.id, u.username, u.email, u.status, u.created_at,
        COUNT(DISTINCT o.id) as order_count,
        COALESCE(SUM(o.total_amount), 0) as total_revenue,
        COALESCE(AVG(o.total_amount), 0) as avg_order_value,
        COUNT(DISTINCT o.user_id) as customer_count
      FROM users u
      LEFT JOIN orders o ON u.id = o.sales_user_id AND o.status IN ('payed', 'shipped', 'completed')
      WHERE u.role = 'sales'
      GROUP BY u.id, u.username, u.email, u.status, u.created_at
      ORDER BY total_revenue DESC
    `);
    
    return successResponse(res, salesUsers, '查询成功');
  } catch (error) {
    console.error('Get sales performance error:', error);
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
      [req.user.id, req.user.username, `创建用户: ${username} (${role})`, 'admin', req.ip]
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
  let connection = null;
  try {
    const { id } = req.params;
    
    if (parseInt(id) === req.user.id) {
      return errorResponse(res, '不能删除自己', 400);
    }
    
    const [userRows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    if (userRows.length === 0) {
      return errorResponse(res, '用户不存在', 404);
    }
    
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      await connection.query('UPDATE users SET status = "inactive" WHERE id = ?', [id]);
    } catch (e) {}
    
    try {
      await connection.query('DELETE FROM cart WHERE user_id = ?', [id]);
    } catch (e) {}
    
    try {
      await connection.query('DELETE FROM recommendations WHERE user_id = ?', [id]);
    } catch (e) {}
    
    await connection.query(
      'INSERT INTO operation_logs (user_id, username, operation, module, ip_address) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.user.username, `禁用用户: ${id}`, 'admin', req.ip]
    );
    
    await connection.commit();
    
    return successResponse(res, null, '用户删除成功');
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
      }
    }
    console.error('Delete user error:', error);
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return errorResponse(res, '该用户存在关联数据，无法删除', 400);
    }
    return errorResponse(res, '服务器内部错误', 500, error);
  } finally {
    if (connection) {
      connection.release();
    }
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

router.get('/users/:id/login-logs', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '20' } = req.query;
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    const [rows] = await pool.query(
      'SELECT * FROM login_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [id, limitNum, offset]
    );
    
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM login_logs WHERE user_id = ?',
      [id]
    );
    
    return paginatedResponse(res, rows, countResult[0].total, pageNum, limitNum);
  } catch (error) {
    console.error('Get login logs error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/logs', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { page = '1', limit = '20', module, user_id } = req.query;
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    let whereClause = '';
    let params = [];
    
    if (module) {
      whereClause = 'WHERE module = ?';
      params.push(module);
    }
    
    if (user_id) {
      whereClause += (whereClause ? ' AND ' : 'WHERE ') + 'user_id = ?';
      params.push(user_id);
    }
    
    const [rows] = await pool.query(
      'SELECT * FROM operation_logs ' + whereClause + ' ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [...params, limitNum, offset]
    );
    
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM operation_logs ' + whereClause,
      params
    );
    
    return paginatedResponse(res, rows, countResult[0].total, pageNum, limitNum);
  } catch (error) {
    console.error('Get logs error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/logs/login', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    const [rows] = await pool.query(
      'SELECT * FROM login_logs ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limitNum, offset]
    );
    
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM login_logs');
    
    return paginatedResponse(res, rows, countResult[0].total, pageNum, limitNum);
  } catch (error) {
    console.error('Get login logs error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/sales-stats', authenticateToken, requireRole('admin'), async (req, res) => {
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
    
    const [orderStatusDist] = await pool.query(`
      SELECT status, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue
      FROM orders
      GROUP BY status
    `);
    
    const [inventoryStats] = await pool.query(`
      SELECT 
        SUM(CASE WHEN stock > 10 THEN 1 ELSE 0 END) as normal_stock,
        SUM(CASE WHEN stock > 0 AND stock <= 10 THEN 1 ELSE 0 END) as low_stock,
        SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock,
        SUM(stock) as total_stock,
        AVG(price) as avg_price
      FROM products
      WHERE status = 'available'
    `);
    
    return successResponse(res, {
      overview: overview[0],
      category_distribution: categoryDist,
      order_status_distribution: orderStatusDist,
      inventory_stats: inventoryStats[0]
    }, '查询成功');
  } catch (error) {
    console.error('Get sales stats error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/reports/export', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { type = 'sales' } = req.query;
    
    let data = {};
    
    if (type === 'sales') {
      const [salesData] = await pool.query(`
        SELECT 
          DATE(o.created_at) as date,
          COUNT(*) as order_count,
          COALESCE(SUM(o.total_amount), 0) as revenue,
          COUNT(DISTINCT o.user_id) as customer_count
        FROM orders o
        WHERE o.status IN ('payed', 'shipped', 'completed')
        GROUP BY DATE(o.created_at)
        ORDER BY date DESC
        LIMIT 30
      `);
      data.sales = salesData;
    } else if (type === 'products') {
      const [productData] = await pool.query(`
        SELECT p.id, p.name, p.category, p.price, p.stock,
          COALESCE(SUM(oi.quantity), 0) as total_sold,
          COALESCE(SUM(oi.quantity * oi.price), 0) as total_revenue
        FROM products p
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.status IN ('payed', 'shipped', 'completed')
        WHERE p.status = 'available'
        GROUP BY p.id, p.name, p.category, p.price, p.stock
        ORDER BY total_revenue DESC
      `);
      data.products = productData;
    } else if (type === 'customers') {
      const [customerData] = await pool.query(`
        SELECT u.id, u.username, u.email, u.created_at,
          COUNT(DISTINCT o.id) as order_count,
          COALESCE(SUM(o.total_amount), 0) as total_spent
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id AND o.status IN ('payed', 'shipped', 'completed')
        WHERE u.role = 'customer'
        GROUP BY u.id, u.username, u.email, u.created_at
        ORDER BY total_spent DESC
      `);
      data.customers = customerData;
    }
    
    await pool.query(
      'INSERT INTO operation_logs (user_id, username, operation, module, ip_address) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.user.username, `导出报表: ${type}`, 'admin', req.ip]
    );
    
    return successResponse(res, data, '报表导出成功');
  } catch (error) {
    console.error('Export reports error:', error);
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
