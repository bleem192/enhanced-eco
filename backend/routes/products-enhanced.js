const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { successResponse, errorResponse, paginatedResponse } = require('../middleware/response');

const router = express.Router();

router.get('/categories', async (req, res) => {
  try {
    const [categories] = await pool.query(`
      SELECT DISTINCT category, COUNT(*) as product_count 
      FROM products 
      WHERE status = 'available' 
      GROUP BY category 
      ORDER BY product_count DESC
    `);
    
    return successResponse(res, categories, '查询成功');
  } catch (error) {
    console.error('Get categories error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/', async (req, res) => {
  try {
    const { page = '1', limit = '10', category, keyword, sort } = req.query;
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitNum;
    
    let query = 'SELECT id, name, category, price, stock, description, image_url, status, created_at FROM products WHERE status = ?';
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

router.get('/my-products', authenticateToken, requireRole(['sales', 'admin']), async (req, res) => {
  try {
    const { page = '1', limit = '10', category, keyword, sort, status } = req.query;
    const { id: user_id, role } = req.user;
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitNum;
    
    let query = 'SELECT id, name, category, price, stock, description, image_url, status, sales_user_id, created_at FROM products WHERE 1=1';
    let params = [];
    
    if (role === 'sales') {
      query += ' AND sales_user_id = ?';
      params.push(user_id);
    }
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    } else {
      query += ' AND status <> "deleted"';
    }
    
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
      'stock_asc': 'stock ASC',
      'stock_desc': 'stock DESC',
      'default': 'created_at DESC'
    };
    const orderBy = sortOptions[sort] || sortOptions['default'];
    
    query += ` ORDER BY ${orderBy} LIMIT ${limitNum} OFFSET ${offset}`;
    
    const [rows] = await pool.query(query, params);
    
    let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
    let countParams = [];
    
    if (role === 'sales') {
      countQuery += ' AND sales_user_id = ?';
      countParams.push(user_id);
    }
    
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    } else {
      countQuery += ' AND status <> "deleted"';
    }
    
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
    console.error('Get my products error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE id = ? AND status = "available"',
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
    const { id: user_id, role } = req.user;
    const { name, category, price, stock, description, image_url } = req.body;
    
    if (!name || !category || !price) {
      return errorResponse(res, '商品名称、分类和价格不能为空', 400);
    }
    
    if (price <= 0) {
      return errorResponse(res, '价格必须大于0', 400);
    }
    
    const sales_user_id = role === 'admin' ? null : user_id;
    
    const [result] = await pool.query(
      'INSERT INTO products (name, category, price, stock, description, image_url, sales_user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, category, price, stock || 0, description || '', image_url || '', sales_user_id]
    );
    
    await pool.query(
      'INSERT INTO operation_logs (user_id, username, operation, module, ip_address) VALUES (?, ?, ?, ?, ?)',
      [user_id, req.user.username, `创建商品: ${name}`, 'products', req.ip]
    );
    
    return successResponse(res, { id: result.insertId, sales_user_id }, '商品创建成功');
  } catch (error) {
    console.error('Create product error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.put('/:id', authenticateToken, requireRole(['sales', 'admin']), async (req, res) => {
  try {
    const { id: user_id, role } = req.user;
    const { id } = req.params;
    const { name, category, price, stock, description, image_url, status } = req.body;
    
    const [existingRows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      return errorResponse(res, '商品不存在', 404);
    }
    
    const oldProduct = existingRows[0];
    
    if (role === 'sales' && oldProduct.sales_user_id !== user_id) {
      return errorResponse(res, '无权修改此商品', 403);
    }
    
    if (price && parseFloat(price) !== parseFloat(oldProduct.price)) {
      try {
        await pool.query(
          'INSERT INTO product_price_history (product_id, old_price, new_price, changed_by, change_reason) VALUES (?, ?, ?, ?, ?)',
          [id, oldProduct.price, price, user_id, '价格修改']
        );
      } catch (err) {
        console.log('product_price_history table may not exist');
      }
    }
    
    const updateFields = [];
    const updateValues = [];
    
    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (category !== undefined) {
      updateFields.push('category = ?');
      updateValues.push(category);
    }
    if (price !== undefined) {
      updateFields.push('price = ?');
      updateValues.push(price);
    }
    if (stock !== undefined) {
      updateFields.push('stock = ?');
      updateValues.push(stock);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (image_url !== undefined) {
      updateFields.push('image_url = ?');
      updateValues.push(image_url);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    
    if (updateFields.length === 0) {
      return errorResponse(res, '没有要更新的字段', 400);
    }
    
    updateValues.push(id);
    
    await pool.query(
      `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    await pool.query(
      'INSERT INTO operation_logs (user_id, username, operation, module, ip_address) VALUES (?, ?, ?, ?, ?)',
      [user_id, req.user.username, `更新商品: ${id}`, 'products', req.ip]
    );
    
    return successResponse(res, null, '商品更新成功');
  } catch (error) {
    console.error('Update product error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.put('/:id/price', authenticateToken, requireRole(['sales', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { price, reason } = req.body;
    const { id: user_id, role } = req.user;
    
    if (!price || price <= 0) {
      return errorResponse(res, '价格必须大于0', 400);
    }
    
    const [existingRows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      return errorResponse(res, '商品不存在', 404);
    }
    
    const product = existingRows[0];
    
    if (role === 'sales' && product.sales_user_id !== user_id) {
      return errorResponse(res, '无权修改此商品价格', 403);
    }
    
    const oldPrice = existingRows[0].price;
    
    await pool.query(
      'INSERT INTO product_price_history (product_id, old_price, new_price, changed_by, change_reason) VALUES (?, ?, ?, ?, ?)',
      [id, oldPrice, price, req.user.id, reason || '价格调整']
    );
    
    await pool.query('UPDATE products SET price = ? WHERE id = ?', [price, id]);
    
    await pool.query(
      'INSERT INTO operation_logs (user_id, username, operation, module, ip_address) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.user.username, `修改商品价格: ${id}, ${oldPrice} -> ${price}`, 'products', req.ip]
    );
    
    return successResponse(res, null, '价格修改成功');
  } catch (error) {
    console.error('Update price error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/:id/price-history', authenticateToken, requireRole(['sales', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '20' } = req.query;
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    const [rows] = await pool.query(`
      SELECT ph.*, u.username as changed_by_username
      FROM product_price_history ph
      JOIN users u ON ph.changed_by = u.id
      WHERE ph.product_id = ?
      ORDER BY ph.created_at DESC
      LIMIT ? OFFSET ?
    `, [id, limitNum, offset]);
    
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM product_price_history WHERE product_id = ?',
      [id]
    );
    
    return paginatedResponse(res, rows, countResult[0].total, pageNum, limitNum);
  } catch (error) {
    console.error('Get price history error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.put('/:id/stock', authenticateToken, requireRole(['sales', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { change_amount, change_type, reason } = req.body;
    const { id: user_id, role } = req.user;
    
    const [existingRows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      return errorResponse(res, '商品不存在', 404);
    }
    
    const product = existingRows[0];
    
    if (role === 'sales' && product.sales_user_id !== user_id) {
      return errorResponse(res, '无权修改此商品库存', 403);
    }
    
    let newStock;
    let actualChange;
    
    if (change_type === 'set') {
      newStock = change_amount;
      actualChange = newStock - existingRows[0].stock;
    } else {
      newStock = change_type === 'increase' 
        ? existingRows[0].stock + change_amount
        : existingRows[0].stock - change_amount;
      actualChange = change_amount;
    }
    
    if (newStock < 0) {
      return errorResponse(res, '库存不能为负数', 400);
    }
    
    await pool.query(
      'INSERT INTO stock_change_logs (product_id, change_amount, change_type, changed_by, change_reason) VALUES (?, ?, ?, ?, ?)',
      [id, actualChange, change_type, req.user.id, reason || '库存调整']
    );
    
    await pool.query('UPDATE products SET stock = ? WHERE id = ?', [newStock, id]);
    
    await pool.query(
      'INSERT INTO operation_logs (user_id, username, operation, module, ip_address) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.user.username, `调整库存: ${id}`, 'products', req.ip]
    );
    
    return successResponse(res, null, '库存更新成功');
  } catch (error) {
    console.error('Update stock error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/:id/stock-history', authenticateToken, requireRole(['sales', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '20' } = req.query;
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    const [rows] = await pool.query(`
      SELECT scl.*, u.username as changed_by_username
      FROM stock_change_logs scl
      JOIN users u ON scl.changed_by = u.id
      WHERE scl.product_id = ?
      ORDER BY scl.created_at DESC
      LIMIT ? OFFSET ?
    `, [id, limitNum, offset]);
    
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM stock_change_logs WHERE product_id = ?',
      [id]
    );
    
    return paginatedResponse(res, rows, countResult[0].total, pageNum, limitNum);
  } catch (error) {
    console.error('Get stock history error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.delete('/:id', authenticateToken, requireRole(['sales', 'admin']), async (req, res) => {
  try {
    const { id: user_id, role } = req.user;
    const { id } = req.params;
    
    const [existingRows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      return errorResponse(res, '商品不存在', 404);
    }
    
    const product = existingRows[0];
    
    if (role === 'sales' && product.sales_user_id !== user_id) {
      return errorResponse(res, '无权下架此商品', 403);
    }
    
    const [result] = await pool.query('UPDATE products SET status = "unavailable" WHERE id = ?', [id]);
    
    await pool.query(
      'INSERT INTO operation_logs (user_id, username, operation, module, ip_address) VALUES (?, ?, ?, ?, ?)',
      [user_id, req.user.username, `下架商品: ${id}`, 'products', req.ip]
    );
    
    return successResponse(res, null, '商品下架成功');
  } catch (error) {
    console.error('Delete product error:', error);
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return errorResponse(res, '该商品存在关联数据，无法删除', 400);
    }
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

module.exports = router;
