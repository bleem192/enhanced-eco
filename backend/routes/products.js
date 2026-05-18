const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { successResponse, errorResponse, paginatedResponse } = require('../middleware/response');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { page = '1', limit = '10', category, keyword, sort } = req.query;
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitNum;
    
    let query = 'SELECT id, name, category, price, stock, description, image_url, created_at FROM products WHERE status = ?';
    let params = ['available'];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    if (keyword) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    
    const sortOptions = {
      'price_asc': 'price ASC',
      'price_desc': 'price DESC',
      'default': 'created_at DESC'
    };
    const orderBy = sortOptions[sort] || sortOptions['default'];
    
    query += ` ORDER BY ${orderBy} LIMIT ${limitNum} OFFSET ${offset}`;
    
    const [rows] = await pool.query(query, params);
    
    let countQuery = 'SELECT COUNT(*) as total FROM products WHERE status = ?';
    let countParams = ['available'];
    if (category) {
      countQuery += ' AND category = ?';
      countParams.push(category);
    }
    if (keyword) {
      countQuery += ' AND (name LIKE ? OR description LIKE ?)';
      countParams.push(`%${keyword}%`, `%${keyword}%`);
    }
    
    const [countResult] = await pool.query(countQuery, countParams);
    
    return paginatedResponse(res, rows, countResult[0].total, pageNum, limitNum);
  } catch (error) {
    console.error('Get products error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT DISTINCT category FROM products WHERE status = "available" ORDER BY category'
    );
    
    return successResponse(res, rows.map(row => row.category), '查询成功');
  } catch (error) {
    console.error('Get categories error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await pool.query(
      'SELECT id, name, category, price, stock, description, image_url, created_at FROM products WHERE id = ? AND status = "available"',
      [id]
    );
    
    if (rows.length === 0) {
      return errorResponse(res, '商品不存在', 404);
    }
    
    return successResponse(res, rows[0], '查询成功');
  } catch (error) {
    console.error('Get product error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.post('/', authenticateToken, requireRole(['sales', 'admin']), async (req, res) => {
  try {
    const { name, category, price, stock, description, image_url } = req.body;
    
    const validationErrors = validateProduct({ name, category, price, stock });
    if (validationErrors) {
      return errorResponse(res, validationErrors, 400);
    }
    
    const [result] = await pool.query(
      'INSERT INTO products (name, category, price, stock, description, image_url) VALUES (?, ?, ?, ?, ?, ?)',
      [name, category, price, stock, description, image_url]
    );
    
    await pool.query(
      'INSERT INTO operation_logs (user_id, username, operation, module, ip_address) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.user.username, `添加商品: ${name}`, 'products', req.ip]
    );
    
    return successResponse(res, { id: result.insertId, name, category, price, stock }, '商品添加成功');
  } catch (error) {
    console.error('Create product error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.put('/:id', authenticateToken, requireRole(['sales', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, price, stock, description, image_url } = req.body;
    
    const validationErrors = validateProduct({ name, category, price, stock });
    if (validationErrors) {
      return errorResponse(res, validationErrors, 400);
    }
    
    const [result] = await pool.query(
      'UPDATE products SET name = ?, category = ?, price = ?, stock = ?, description = ?, image_url = ? WHERE id = ?',
      [name, category, price, stock, description, image_url, id]
    );
    
    if (result.affectedRows === 0) {
      return errorResponse(res, '商品不存在', 404);
    }
    
    await pool.query(
      'INSERT INTO operation_logs (user_id, username, operation, module, ip_address) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.user.username, `更新商品: ${id}`, 'products', req.ip]
    );
    
    return successResponse(res, null, '商品更新成功');
  } catch (error) {
    console.error('Update product error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.delete('/:id', authenticateToken, requireRole(['sales', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return errorResponse(res, '商品不存在', 404);
    }
    
    await pool.query(
      'INSERT INTO operation_logs (user_id, username, operation, module, ip_address) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.user.username, `删除商品: ${id}`, 'products', req.ip]
    );
    
    return successResponse(res, null, '商品删除成功');
  } catch (error) {
    console.error('Delete product error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

function validateProduct({ name, category, price, stock }) {
  const errors = [];
  if (!name || name.trim().length === 0) {
    errors.push('商品名称不能为空');
  }
  if (!category || category.trim().length === 0) {
    errors.push('商品分类不能为空');
  }
  if (!price || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
    errors.push('价格必须为非负数');
  }
  if (!stock || isNaN(parseInt(stock)) || parseInt(stock) < 0) {
    errors.push('库存必须为非负整数');
  }
  return errors.length > 0 ? errors.join('；') : null;
}

module.exports = router;
