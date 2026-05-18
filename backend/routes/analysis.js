const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../middleware/response');

const router = express.Router();

router.get('/', authenticateToken, requireRole(['admin', 'sales']), async (req, res) => {
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

    const [salesTrend] = await pool.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        SUM(total_amount) as revenue,
        COUNT(*) as orders
      FROM orders 
      WHERE status IN ('payed', 'shipped', 'completed')
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY DATE_FORMAT(created_at, '%Y-%m')
      LIMIT 12
    `);

    const [categoryDist] = await pool.query(`
      SELECT p.category, COUNT(oi.id) as count, SUM(oi.quantity * oi.price) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status IN ('payed', 'shipped', 'completed')
      GROUP BY p.category
    `);

    const [topProducts] = await pool.query(`
      SELECT p.id, p.name, p.category, SUM(oi.quantity) as sales_count
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status IN ('payed', 'shipped', 'completed')
      GROUP BY p.id, p.name, p.category
      ORDER BY sales_count DESC
      LIMIT 10
    `);

    const [topCustomers] = await pool.query(`
      SELECT u.id, u.username, SUM(o.total_amount) as total_spent, COUNT(o.id) as order_count
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.status IN ('payed', 'shipped', 'completed')
      GROUP BY u.id, u.username
      ORDER BY total_spent DESC
      LIMIT 10
    `);

    return successResponse(res, {
      overview: overview[0],
      sales_trend: salesTrend.map(row => parseFloat(row.revenue) || 0),
      category_distribution: categoryDist.map(row => ({
        name: row.category,
        value: parseFloat(row.revenue) || 0
      })),
      top_products: topProducts,
      top_customers: topCustomers
    }, '查询成功');
  } catch (error) {
    console.error('Get analytics error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/recommendations', authenticateToken, requireRole('customer'), async (req, res) => {
  try {
    const { id: user_id } = req.user;

    const [recRows] = await pool.query(`
      SELECT p.id, p.name, p.category, p.price, p.image_url, r.score
      FROM recommendations r
      JOIN products p ON r.product_id = p.id
      WHERE r.user_id = ? AND p.status = 'available'
      ORDER BY r.score DESC
      LIMIT 6
    `, [user_id]);

    if (recRows.length > 0) {
      return successResponse(res, { products: recRows }, '查询成功');
    }

    const [popularRows] = await pool.query(`
      SELECT p.id, p.name, p.category, p.price, p.image_url, SUM(oi.quantity) as sales_count
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status IN ('payed', 'shipped', 'completed') AND p.status = 'available'
      GROUP BY p.id
      ORDER BY sales_count DESC
      LIMIT 6
    `);

    return successResponse(res, { products: popularRows }, '查询成功');
  } catch (error) {
    console.error('Get recommendations error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.post('/trigger-recommend', authenticateToken, requireRole(['admin', 'sales']), async (req, res) => {
  try {
    const { strategy = 'collaborative' } = req.body;

    if (strategy === 'collaborative') {
      await generateCollaborativeRecommendations();
    } else if (strategy === 'content') {
      await generateContentRecommendations();
    } else {
      await generatePopularRecommendations();
    }

    await pool.query(
      'INSERT INTO operation_logs (user_id, username, operation, module, ip_address) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, req.user.username, `执行推荐策略: ${strategy}`, 'analysis', req.ip]
    );

    return successResponse(res, null, '推荐策略执行成功');
  } catch (error) {
    console.error('Trigger recommend error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/user-profile', authenticateToken, async (req, res) => {
  try {
    const { id: user_id } = req.user;
    
    const [profile] = await pool.query(`
      SELECT u.username, u.email, u.role, 
        COUNT(DISTINCT o.id) as order_count,
        COALESCE(SUM(o.total_amount), 0) as total_spent
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id AND o.status IN ('payed', 'shipped', 'completed')
      WHERE u.id = ?
      GROUP BY u.id, u.username, u.email, u.role
    `, [user_id]);
    
    return successResponse(res, profile[0] || null, '查询成功');
  } catch (error) {
    console.error('Get user profile error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/sales-trend', authenticateToken, requireRole(['admin', 'sales']), async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFormat = '%Y-%m-%d';
    if (period === 'week') {
      dateFormat = '%Y-%u';
    } else if (period === 'month') {
      dateFormat = '%Y-%m';
    } else if (period === 'year') {
      dateFormat = '%Y';
    }
    
    const [trend] = await pool.query(`
      SELECT DATE_FORMAT(o.created_at, ?) as period,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.total_amount), 0) as revenue,
        COUNT(DISTINCT o.user_id) as customer_count
      FROM orders o
      WHERE o.status IN ('payed', 'shipped', 'completed')
      GROUP BY period
      ORDER BY period DESC
      LIMIT 12
    `, [dateFormat]);
    
    return successResponse(res, trend.reverse(), '查询成功');
  } catch (error) {
    console.error('Get sales trend error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/sales-ranking', authenticateToken, requireRole(['admin', 'sales']), async (req, res) => {
  try {
    const [products] = await pool.query(`
      SELECT p.id, p.name, p.category, p.price,
        COALESCE(SUM(oi.quantity), 0) as total_sold,
        COALESCE(SUM(oi.quantity * oi.price), 0) as total_revenue
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status IN ('payed', 'shipped', 'completed')
      GROUP BY p.id, p.name, p.category, p.price
      ORDER BY total_revenue DESC
      LIMIT 20
    `);
    
    const [customers] = await pool.query(`
      SELECT u.id, u.username, u.email,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.total_amount), 0) as total_spent
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id AND o.status IN ('payed', 'shipped', 'completed')
      GROUP BY u.id, u.username, u.email
      ORDER BY total_spent DESC
      LIMIT 20
    `);
    
    return successResponse(res, { products, customers }, '查询成功');
  } catch (error) {
    console.error('Get sales ranking error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.post('/behavior', authenticateToken, async (req, res) => {
  try {
    const { id: user_id } = req.user;
    const { product_id, behavior_type } = req.body;
    
    if (!product_id || !behavior_type) {
      return errorResponse(res, '参数错误', 400);
    }
    
    await pool.query(
      'INSERT INTO user_behavior (user_id, product_id, behavior_type) VALUES (?, ?, ?)',
      [user_id, product_id, behavior_type]
    );
    
    return successResponse(res, null, '行为记录成功');
  } catch (error) {
    console.error('Record behavior error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/anomaly-detection', authenticateToken, requireRole(['admin', 'sales']), async (req, res) => {
  try {
    const [largeOrders] = await pool.query(`
      SELECT id, user_id, total_amount, status, created_at
      FROM orders
      WHERE total_amount > (SELECT AVG(total_amount) * 3 FROM orders WHERE status IN ('payed', 'shipped', 'completed'))
      ORDER BY total_amount DESC
      LIMIT 10
    `);
    
    const [rapidPurchases] = await pool.query(`
      SELECT user_id, COUNT(*) as order_count, created_at
      FROM orders
      WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
      GROUP BY user_id, created_at
      HAVING COUNT(*) > 3
    `);
    
    return successResponse(res, {
      large_orders: largeOrders,
      rapid_purchases: rapidPurchases
    }, '查询成功');
  } catch (error) {
    console.error('Get anomaly detection error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/analytics', authenticateToken, requireRole(['admin', 'sales']), async (req, res) => {
  try {
    const [overview] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM products WHERE status = 'available') as total_products,
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status IN ('payed', 'shipped', 'completed')) as total_revenue
    `);
    
    const [dailyStats] = await pool.query(`
      SELECT 
        COUNT(*) as today_orders,
        COALESCE(SUM(total_amount), 0) as today_revenue
      FROM orders 
      WHERE DATE(created_at) = CURDATE() AND status IN ('payed', 'shipped', 'completed')
    `);
    
    const [monthlyStats] = await pool.query(`
      SELECT 
        COUNT(*) as month_orders,
        COALESCE(SUM(total_amount), 0) as month_revenue
      FROM orders 
      WHERE DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m') AND status IN ('payed', 'shipped', 'completed')
    `);
    
    return successResponse(res, {
      overview: overview[0],
      today: dailyStats[0],
      monthly: monthlyStats[0]
    }, '查询成功');
  } catch (error) {
    console.error('Get analytics error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

const generateCollaborativeRecommendations = async () => {
  const [purchaseData] = await pool.query(`
    SELECT o.user_id, oi.product_id, COUNT(*) as freq
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.status IN ('payed', 'shipped', 'completed')
    GROUP BY o.user_id, oi.product_id
  `);

  const userProducts = {};
  purchaseData.forEach(row => {
    if (!userProducts[row.user_id]) {
      userProducts[row.user_id] = [];
    }
    userProducts[row.user_id].push(row.product_id);
  });

  const [userRows] = await pool.query('SELECT id FROM users WHERE role = "customer"');
  const [productRows] = await pool.query('SELECT id FROM products WHERE status = "available"');

  for (const user of userRows) {
    const userId = user.id;
    const userPurchases = userProducts[userId] || [];
    const recommendations = [];

    for (const product of productRows) {
      const productId = product.id;
      if (userPurchases.includes(productId)) continue;

      let score = 0;
      let count = 0;

      for (const [otherUserId, otherPurchases] of Object.entries(userProducts)) {
        if (otherUserId == userId) continue;
        
        const common = otherPurchases.filter(p => userPurchases.includes(p)).length;
        const union = new Set([...otherPurchases, ...userPurchases]).size;
        
        if (union > 0 && otherPurchases.includes(productId)) {
          const similarity = common / union;
          score += similarity;
          count++;
        }
      }

      if (count > 0) {
        score = score / count;
        recommendations.push({ product_id: productId, score: Math.round(score * 10000) / 10000 });
      }
    }

    recommendations.sort((a, b) => b.score - a.score);

    for (const rec of recommendations.slice(0, 10)) {
      await pool.query(`
        INSERT INTO recommendations (user_id, product_id, score)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE score = VALUES(score)
      `, [userId, rec.product_id, rec.score]);
    }
  }
};

const generateContentRecommendations = async () => {
  const [categoryData] = await pool.query(`
    SELECT p.category, COUNT(oi.id) as count
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status IN ('payed', 'shipped', 'completed')
    GROUP BY p.category
  `);

  const [userRows] = await pool.query('SELECT id FROM users WHERE role = "customer"');

  for (const user of userRows) {
    const [userPurchases] = await pool.query(`
      SELECT DISTINCT p.category
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.user_id = ? AND o.status IN ('payed', 'shipped', 'completed')
    `, [user.id]);

    const userCategories = new Set(userPurchases.map(row => row.category));

    const [productRows] = await pool.query(`
      SELECT id, category, price
      FROM products 
      WHERE status = 'available'
    `);

    for (const product of productRows) {
      let score = 0;
      if (userCategories.has(product.category)) {
        score = 0.8 + Math.random() * 0.2;
      } else {
        score = Math.random() * 0.3;
      }

      await pool.query(`
        INSERT INTO recommendations (user_id, product_id, score)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE score = VALUES(score)
      `, [user.id, product.id, Math.round(score * 10000) / 10000]);
    }
  }
};

const generatePopularRecommendations = async () => {
  const [popularProducts] = await pool.query(`
    SELECT p.id, SUM(oi.quantity) as sales_count
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status IN ('payed', 'shipped', 'completed') AND p.status = 'available'
    GROUP BY p.id
    ORDER BY sales_count DESC
    LIMIT 20
  `);

  const [userRows] = await pool.query('SELECT id FROM users WHERE role = "customer"');

  for (const user of userRows) {
    const [userPurchases] = await pool.query(`
      SELECT DISTINCT oi.product_id
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = ?
    `, [user.id]);

    const purchasedIds = new Set(userPurchases.map(row => row.product_id));

    for (let i = 0; i < popularProducts.length; i++) {
      const product = popularProducts[i];
      if (purchasedIds.has(product.id)) continue;
      
      const score = Math.round((1 - i / popularProducts.length) * 10000) / 10000;
      
      await pool.query(`
        INSERT INTO recommendations (user_id, product_id, score)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE score = VALUES(score)
      `, [user.id, product.id, score]);
    }
  }
};

module.exports = router;
