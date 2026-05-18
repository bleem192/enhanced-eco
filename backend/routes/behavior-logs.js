const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

router.post('/view', async (req, res) => {
  try {
    const { user_id, username, product_id, product_name, category, page_url, session_id } = req.body;
    
    await pool.query(
      'INSERT INTO user_behavior_logs (user_id, username, behavior_type, product_id, product_name, category, page_url, session_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [user_id || null, username || 'anonymous', 'view', product_id, product_name, category, page_url, session_id]
    );
    
    return res.json({ success: true, message: '浏览记录已保存' });
  } catch (error) {
    console.error('Save behavior log error:', error);
    return res.status(500).json({ success: false, message: '保存失败' });
  }
});

router.post('/view-duration', async (req, res) => {
  try {
    const { user_id, username, product_id, product_name, category, page_url, session_id, duration } = req.body;
    
    await pool.query(
      'INSERT INTO user_behavior_logs (user_id, username, behavior_type, product_id, product_name, category, page_url, session_id, duration, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [user_id || null, username || 'anonymous', 'view_duration', product_id, product_name, category, page_url, session_id, duration]
    );
    
    return res.json({ success: true, message: '停留时长记录已保存' });
  } catch (error) {
    console.error('Save duration log error:', error);
    return res.status(500).json({ success: false, message: '保存失败' });
  }
});

router.post('/purchase', async (req, res) => {
  try {
    const { user_id, username, order_id, items, total_amount } = req.body;
    
    for (const item of items) {
      await pool.query(
        'INSERT INTO purchase_logs (user_id, username, order_id, product_id, product_name, category, price, quantity, total_amount, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
        [user_id, username, order_id, item.product_id, item.product_name, item.category, item.price, item.quantity, total_amount]
      );
    }
    
    return res.json({ success: true, message: '购买记录已保存' });
  } catch (error) {
    console.error('Save purchase log error:', error);
    return res.status(500).json({ success: false, message: '保存失败' });
  }
});

router.get('/query', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      start_time, 
      end_time, 
      user_id, 
      username, 
      category,
      behavior_type,
      export_type 
    } = req.query;
    
    let query = `
      SELECT * FROM user_behavior_logs 
      WHERE 1=1
    `;
    let params = [];
    
    if (start_time) {
      query += ' AND created_at >= ?';
      params.push(start_time);
    }
    if (end_time) {
      query += ' AND created_at <= ?';
      params.push(end_time);
    }
    if (user_id) {
      query += ' AND user_id = ?';
      params.push(user_id);
    }
    if (username) {
      query += ' AND username LIKE ?';
      params.push(`%${username}%`);
    }
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (behavior_type) {
      query += ' AND behavior_type = ?';
      params.push(behavior_type);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0].count;
    
    query += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offset);
    
    const [rows] = await pool.query(query, params);
    
    if (export_type === 'csv') {
      const headers = ['ID', '用户ID', '用户名', '行为类型', '商品ID', '商品名称', '分类', '页面URL', '会话ID', '停留时长(秒)', '创建时间'];
      const rowsData = rows.map(row => [
        row.id,
        row.user_id || '',
        row.username,
        row.behavior_type === 'view' ? '浏览' : '停留',
        row.product_id || '',
        row.product_name || '',
        row.category || '',
        row.page_url || '',
        row.session_id || '',
        row.duration || '',
        row.created_at
      ]);
      
      let csv = headers.join(',') + '\n';
      rowsData.forEach(row => {
        csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=behavior_logs.csv');
      return res.send(csv);
    }
    
    return res.json({
      success: true,
      data: {
        list: rows,
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Query behavior logs error:', error);
    return res.status(500).json({ success: false, message: '查询失败', error: error.message });
  }
});

router.get('/purchase/query', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      start_time, 
      end_time, 
      user_id, 
      username, 
      category,
      export_type 
    } = req.query;
    
    let query = `
      SELECT * FROM purchase_logs 
      WHERE 1=1
    `;
    let params = [];
    
    if (start_time) {
      query += ' AND created_at >= ?';
      params.push(start_time);
    }
    if (end_time) {
      query += ' AND created_at <= ?';
      params.push(end_time);
    }
    if (user_id) {
      query += ' AND user_id = ?';
      params.push(user_id);
    }
    if (username) {
      query += ' AND username LIKE ?';
      params.push(`%${username}%`);
    }
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0].count;
    
    query += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offset);
    
    const [rows] = await pool.query(query, params);
    
    if (export_type === 'csv') {
      const headers = ['ID', '用户ID', '用户名', '订单ID', '商品ID', '商品名称', '分类', '单价', '数量', '订单总额', '创建时间'];
      const rowsData = rows.map(row => [
        row.id,
        row.user_id,
        row.username,
        row.order_id,
        row.product_id,
        row.product_name,
        row.category,
        row.price,
        row.quantity,
        row.total_amount,
        row.created_at
      ]);
      
      let csv = headers.join(',') + '\n';
      rowsData.forEach(row => {
        csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=purchase_logs.csv');
      return res.send(csv);
    }
    
    return res.json({
      success: true,
      data: {
        list: rows,
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Query purchase logs error:', error);
    return res.status(500).json({ success: false, message: '查询失败', error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [behaviorStats] = await pool.query(`
      SELECT behavior_type, COUNT(*) as count, COUNT(DISTINCT user_id) as user_count 
      FROM user_behavior_logs 
      GROUP BY behavior_type
    `);
    
    const [topViewed] = await pool.query(`
      SELECT product_id, product_name, category, COUNT(*) as view_count 
      FROM user_behavior_logs 
      WHERE behavior_type = 'view'
      GROUP BY product_id, product_name, category 
      ORDER BY view_count DESC 
      LIMIT 10
    `);
    
    return res.json({
      success: true,
      data: {
        behavior_stats: behaviorStats,
        top_viewed: topViewed
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return res.status(500).json({ success: false, message: '获取统计失败', error: error.message });
  }
});

module.exports = router;