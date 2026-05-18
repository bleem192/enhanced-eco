const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../middleware/response');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { id: user_id } = req.user;
    
    const [rows] = await pool.query(`
      SELECT c.id, c.product_id, c.quantity, p.name, p.category, p.price, p.image_url 
      FROM cart c 
      JOIN products p ON c.product_id = p.id 
      WHERE c.user_id = ?
    `, [user_id]);
    
    return successResponse(res, rows, '查询成功');
  } catch (error) {
    console.error('Get cart error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.post('/add', authenticateToken, async (req, res) => {
  try {
    const { id: user_id } = req.user;
    const { product_id, quantity = 1 } = req.body;
    
    if (!product_id || quantity < 1) {
      return errorResponse(res, '参数错误', 400);
    }
    
    const [productRows] = await pool.query(
      'SELECT stock FROM products WHERE id = ? AND status = "available"',
      [product_id]
    );
    
    if (productRows.length === 0) {
      return errorResponse(res, '商品不存在', 404);
    }
    
    const product = productRows[0];
    if (product.stock < quantity) {
      return errorResponse(res, '库存不足', 400);
    }
    
    const [existingRows] = await pool.query(
      'SELECT quantity FROM cart WHERE user_id = ? AND product_id = ?',
      [user_id, product_id]
    );
    
    if (existingRows.length > 0) {
      const newQuantity = existingRows[0].quantity + quantity;
      if (newQuantity > product.stock) {
        return errorResponse(res, '库存不足', 400);
      }
      
      await pool.query(
        'UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?',
        [newQuantity, user_id, product_id]
      );
    } else {
      await pool.query(
        'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
        [user_id, product_id, quantity]
      );
    }
    
    await pool.query(
      'INSERT INTO user_behavior (user_id, product_id, behavior_type) VALUES (?, ?, ?)',
      [user_id, product_id, 'add_cart']
    );
    
    return successResponse(res, null, '添加成功');
  } catch (error) {
    console.error('Add to cart error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id: cart_id } = req.params;
    const { id: user_id } = req.user;
    const { quantity } = req.body;
    
    if (!quantity || quantity < 1) {
      return errorResponse(res, '数量不能小于1', 400);
    }
    
    const [cartRows] = await pool.query(
      'SELECT c.product_id, p.stock FROM cart c JOIN products p ON c.product_id = p.id WHERE c.id = ? AND c.user_id = ?',
      [cart_id, user_id]
    );
    
    if (cartRows.length === 0) {
      return errorResponse(res, '购物车项不存在', 404);
    }
    
    if (cartRows[0].stock < quantity) {
      return errorResponse(res, '库存不足', 400);
    }
    
    await pool.query(
      'UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?',
      [quantity, cart_id, user_id]
    );
    
    return successResponse(res, null, '更新成功');
  } catch (error) {
    console.error('Update cart error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id: cart_id } = req.params;
    const { id: user_id } = req.user;
    
    const [result] = await pool.query(
      'DELETE FROM cart WHERE id = ? AND user_id = ?',
      [cart_id, user_id]
    );
    
    if (result.affectedRows === 0) {
      return errorResponse(res, '购物车项不存在', 404);
    }
    
    return successResponse(res, null, '删除成功');
  } catch (error) {
    console.error('Delete cart error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.delete('/', authenticateToken, async (req, res) => {
  try {
    const { id: user_id } = req.user;
    
    await pool.query('DELETE FROM cart WHERE user_id = ?', [user_id]);
    
    return successResponse(res, null, '购物车已清空');
  } catch (error) {
    console.error('Clear cart error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

module.exports = router;
