const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../middleware/response');

router.get('/', authenticateToken, requireRole(['sales', 'admin']), async (req, res) => {
  try {
    const { id: user_id, role } = req.user;
    
    let query = 'SELECT * FROM product_categories';
    let params = [];
    
    if (role === 'sales') {
      query += ' WHERE sales_user_id = ?';
      params.push(user_id);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await pool.query(query, params);
    
    return successResponse(res, rows, '查询成功');
  } catch (error) {
    console.error('Get categories error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.post('/', authenticateToken, requireRole(['sales', 'admin']), async (req, res) => {
  try {
    const { id: user_id, role } = req.user;
    const { name, description } = req.body;
    
    if (!name || name.trim() === '') {
      return errorResponse(res, '类别名称不能为空', 400);
    }
    
    const sales_user_id = role === 'admin' ? null : user_id;
    
    if (role === 'sales') {
      const [existing] = await pool.query(
        'SELECT * FROM product_categories WHERE sales_user_id = ? AND name = ?',
        [user_id, name.trim()]
      );
      
      if (existing.length > 0) {
        return errorResponse(res, '该类别已存在', 400);
      }
    }
    
    const [result] = await pool.query(
      'INSERT INTO product_categories (sales_user_id, name, description) VALUES (?, ?, ?)',
      [sales_user_id, name.trim(), description || '']
    );
    
    await pool.query(
      'INSERT INTO operation_logs (user_id, username, operation, module, ip_address) VALUES (?, ?, ?, ?, ?)',
      [user_id, req.user.username, `添加商品类别: ${name}`, 'categories', req.ip]
    );
    
    return successResponse(res, { id: result.insertId, name: name.trim(), description: description || '' }, '类别添加成功');
  } catch (error) {
    console.error('Create category error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return errorResponse(res, '该类别已存在', 400);
    }
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.delete('/:id', authenticateToken, requireRole(['sales', 'admin']), async (req, res) => {
  try {
    const { id: category_id } = req.params;
    const { id: user_id, role } = req.user;
    
    const [categories] = await pool.query(
      'SELECT * FROM product_categories WHERE id = ?',
      [category_id]
    );
    
    if (categories.length === 0) {
      return errorResponse(res, '类别不存在', 404);
    }
    
    const category = categories[0];
    
    if (role === 'sales' && category.sales_user_id !== user_id) {
      return errorResponse(res, '无权删除此类别', 403);
    }
    
    const [products] = await pool.query(
      'SELECT COUNT(*) as count FROM products WHERE category = ?',
      [category.name]
    );
    
    if (products[0].count > 0) {
      return errorResponse(res, '该类别下有商品，无法删除', 400);
    }
    
    await pool.query('DELETE FROM product_categories WHERE id = ?', [category_id]);
    
    await pool.query(
      'INSERT INTO operation_logs (user_id, username, operation, module, ip_address) VALUES (?, ?, ?, ?, ?)',
      [user_id, req.user.username, `删除商品类别: ${category.name}`, 'categories', req.ip]
    );
    
    return successResponse(res, null, '类别删除成功');
  } catch (error) {
    console.error('Delete category error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.put('/:id', authenticateToken, requireRole(['sales', 'admin']), async (req, res) => {
  try {
    const { id: category_id } = req.params;
    const { id: user_id, role } = req.user;
    const { name, description } = req.body;
    
    if (!name || name.trim() === '') {
      return errorResponse(res, '类别名称不能为空', 400);
    }
    
    const [categories] = await pool.query(
      'SELECT * FROM product_categories WHERE id = ?',
      [category_id]
    );
    
    if (categories.length === 0) {
      return errorResponse(res, '类别不存在', 404);
    }
    
    const category = categories[0];
    
    if (role === 'sales' && category.sales_user_id !== user_id) {
      return errorResponse(res, '无权修改此类别', 403);
    }
    
    await pool.query(
      'UPDATE product_categories SET name = ?, description = ? WHERE id = ?',
      [name.trim(), description || '', category_id]
    );
    
    await pool.query(
      'UPDATE products SET category = ? WHERE category = ? AND sales_user_id = ?',
      [name.trim(), category.name, category.sales_user_id]
    );
    
    await pool.query(
      'INSERT INTO operation_logs (user_id, username, operation, module, ip_address) VALUES (?, ?, ?, ?, ?)',
      [user_id, req.user.username, `修改商品类别: ${category.name} -> ${name}`, 'categories', req.ip]
    );
    
    return successResponse(res, null, '类别修改成功');
  } catch (error) {
    console.error('Update category error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return errorResponse(res, '该类别已存在', 400);
    }
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

module.exports = router;
