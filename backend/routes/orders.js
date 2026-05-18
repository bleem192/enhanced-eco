const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { successResponse, errorResponse, paginatedResponse } = require('../middleware/response');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { id: user_id, role } = req.user;
    const { page = '1', limit = '10' } = req.query;
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitNum;
    
    let query = 'SELECT id, user_id, total_amount, status, shipping_address, payment_method, sales_user_id, created_at FROM orders';
    let countQuery = 'SELECT COUNT(*) as total FROM orders';
    let params = [];
    let countParams = [];
    
    if (role === 'customer') {
      query += ' WHERE user_id = ?';
      countQuery += ' WHERE user_id = ?';
      params.push(user_id);
      countParams.push(user_id);
    } else if (role === 'sales') {
      query += ' WHERE sales_user_id = ? OR user_id = ?';
      countQuery += ' WHERE sales_user_id = ? OR user_id = ?';
      params.push(user_id, user_id);
      countParams.push(user_id, user_id);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
    
    const [orderRows] = await pool.query(query, params);
    
    const orders = await Promise.all(orderRows.map(async (order) => {
      const [itemRows] = await pool.query(
        'SELECT id, product_id, product_name, quantity, price FROM order_items WHERE order_id = ?',
        [order.id]
      );
      return { ...order, items: itemRows };
    }));
    
    const [countResult] = await pool.query(countQuery, countParams);
    
    return paginatedResponse(res, orders, countResult[0].total, pageNum, limitNum);
  } catch (error) {
    console.error('Get orders error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.post('/', authenticateToken, requireRole('customer'), async (req, res) => {
  try {
    const { id: user_id } = req.user;
    const { items, shipping_address, payment_method } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(res, '订单商品不能为空', 400);
    }
    
    const total_amount = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
    
    const order_id = uuidv4();
    
    let sales_user_id = null;
    const productIds = items.map(item => item.product_id);
    if (productIds.length > 0) {
      const [products] = await pool.query(
        'SELECT DISTINCT sales_user_id FROM products WHERE id IN (?) AND sales_user_id IS NOT NULL LIMIT 1',
        [productIds]
      );
      if (products.length > 0) {
        sales_user_id = products[0].sales_user_id;
      }
    }
    
    await pool.query(
      'INSERT INTO orders (id, user_id, total_amount, shipping_address, payment_method, sales_user_id) VALUES (?, ?, ?, ?, ?, ?)',
      [order_id, user_id, total_amount, shipping_address, payment_method, sales_user_id]
    );
    
    for (const item of items) {
      await pool.query(
        'INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES (?, ?, ?, ?, ?)',
        [order_id, item.product_id, item.product_name || '', item.quantity, item.price]
      );
      
      await pool.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
      
      await pool.query(
        'INSERT INTO user_behavior (user_id, product_id, behavior_type) VALUES (?, ?, ?)',
        [user_id, item.product_id, 'purchase']
      );
    }
    
    await pool.query('DELETE FROM cart WHERE user_id = ?', [user_id]);
    
    await pool.query(
      'INSERT INTO operation_logs (user_id, username, operation, module, ip_address) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.user.username, `创建订单: ${order_id}`, 'orders', req.ip]
    );
    
    return successResponse(res, { order_id, total_amount, sales_user_id }, '订单创建成功');
  } catch (error) {
    console.error('Create order error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.put('/:id', authenticateToken, requireRole(['sales', 'admin']), async (req, res) => {
  try {
    const { id: order_id } = req.params;
    const { id: user_id, role } = req.user;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'payed', 'shipped', 'completed', 'canceled'];
    if (!status || !validStatuses.includes(status)) {
      return errorResponse(res, '无效的订单状态', 400);
    }
    
    const [orderRows] = await pool.query(
      'SELECT sales_user_id FROM orders WHERE id = ?',
      [order_id]
    );
    
    if (orderRows.length === 0) {
      return errorResponse(res, '订单不存在', 404);
    }
    
    const order = orderRows[0];
    
    if (role === 'sales' && order.sales_user_id !== user_id) {
      return errorResponse(res, '无权更新此订单', 403);
    }
    
    const [result] = await pool.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, order_id]
    );
    
    await pool.query(
      'INSERT INTO operation_logs (user_id, username, operation, module, ip_address) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.user.username, `更新订单状态: ${order_id} -> ${status}`, 'orders', req.ip]
    );
    
    return successResponse(res, null, '订单状态更新成功');
  } catch (error) {
    console.error('Update order error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id: order_id } = req.params;
    const { id: user_id, role } = req.user;
    
    const [orderRows] = await pool.query(
      'SELECT id, user_id, total_amount, status, shipping_address, payment_method, sales_user_id, created_at FROM orders WHERE id = ?',
      [order_id]
    );
    
    if (orderRows.length === 0) {
      return errorResponse(res, '订单不存在', 404);
    }
    
    const order = orderRows[0];
    
    if (role === 'customer' && order.user_id !== user_id) {
      return errorResponse(res, '无权访问此订单', 403);
    }
    
    if (role === 'sales' && order.sales_user_id !== user_id && order.user_id !== user_id) {
      return errorResponse(res, '无权访问此订单', 403);
    }
    
    const [itemRows] = await pool.query(
      'SELECT id, product_id, product_name, quantity, price FROM order_items WHERE order_id = ?',
      [order_id]
    );
    
    return successResponse(res, { ...order, items: itemRows }, '查询成功');
  } catch (error) {
    console.error('Get order error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

module.exports = router;
