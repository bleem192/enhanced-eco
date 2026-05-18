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
    
    const [categoryPreferences] = await pool.query(`
      SELECT p.category, COUNT(*) as count
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.user_id = ? AND o.status IN ('payed', 'shipped', 'completed')
      GROUP BY p.category
      ORDER BY count DESC
    `, [user_id]);
    
    return successResponse(res, {
      ...profile[0],
      category_preferences: categoryPreferences
    }, '查询成功');
  } catch (error) {
    console.error('Get user profile error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/customer-analysis', authenticateToken, requireRole(['admin', 'sales']), async (req, res) => {
  try {
    const [customers] = await pool.query(`
      SELECT u.id, u.username, u.email, u.created_at,
        COUNT(DISTINCT o.id) as order_count,
        COALESCE(SUM(o.total_amount), 0) as total_spent,
        MAX(o.created_at) as last_order_date
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id AND o.status IN ('payed', 'shipped', 'completed')
      WHERE u.role = 'customer'
      GROUP BY u.id, u.username, u.email, u.created_at
      ORDER BY total_spent DESC
    `);
    
    const [purchasePower] = await pool.query(`
      SELECT 
        CASE 
          WHEN total_spent >= 10000 THEN 'high'
          WHEN total_spent >= 5000 THEN 'medium'
          ELSE 'low'
        END as power_level,
        COUNT(*) as customer_count
      FROM (
        SELECT u.id, COALESCE(SUM(o.total_amount), 0) as total_spent
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id AND o.status IN ('payed', 'shipped', 'completed')
        WHERE u.role = 'customer'
        GROUP BY u.id
      ) as customer_stats
      GROUP BY power_level
    `);
    
    return successResponse(res, {
      customers,
      purchase_power_distribution: purchasePower
    }, '查询成功');
  } catch (error) {
    console.error('Get customer analysis error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/sales-trend', authenticateToken, requireRole(['admin', 'sales']), async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFormat = '%Y-%m-%d';
    let groupBy = 'DATE(created_at)';
    
    if (period === 'week') {
      dateFormat = '%Y-%u';
      groupBy = 'YEARWEEK(created_at, 1)';
    } else if (period === 'month') {
      dateFormat = '%Y-%m';
      groupBy = 'DATE_FORMAT(created_at, "%Y-%m")';
    } else if (period === 'year') {
      dateFormat = '%Y';
      groupBy = 'YEAR(created_at)';
    }
    
    const [trend] = await pool.query(`
      SELECT DATE_FORMAT(created_at, ?) as period,
        COUNT(o.id) as order_count,
        COALESCE(SUM(total_amount), 0) as revenue,
        COUNT(DISTINCT user_id) as customer_count
      FROM orders o
      WHERE status IN ('payed', 'shipped', 'completed')
      GROUP BY ${groupBy}
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
    const { sort_by = 'revenue', order = 'DESC', limit = 20 } = req.query;
    
    let orderClause = 'total_revenue DESC';
    if (sort_by === 'sold') orderClause = 'total_sold DESC';
    if (sort_by === 'name') orderClause = 'name ASC';
    
    const [products] = await pool.query(`
      SELECT p.id, p.name, p.category, p.price, p.stock,
        COALESCE(SUM(oi.quantity), 0) as total_sold,
        COALESCE(SUM(oi.quantity * oi.price), 0) as total_revenue
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status IN ('payed', 'shipped', 'completed')
      GROUP BY p.id, p.name, p.category, p.price, p.stock
      ORDER BY ${orderClause}
      LIMIT ?
    `, [parseInt(limit)]);
    
    const [customers] = await pool.query(`
      SELECT u.id, u.username, u.email,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.total_amount), 0) as total_spent
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id AND o.status IN ('payed', 'shipped', 'completed')
      WHERE u.role = 'customer'
      GROUP BY u.id, u.username, u.email
      ORDER BY total_spent DESC
      LIMIT ?
    `, [parseInt(limit)]);
    
    return successResponse(res, { products, customers }, '查询成功');
  } catch (error) {
    console.error('Get sales ranking error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/category-analysis', authenticateToken, requireRole(['admin', 'sales']), async (req, res) => {
  try {
    const [categoryStats] = await pool.query(`
      SELECT 
        p.category,
        COUNT(DISTINCT oi.order_id) as order_count,
        SUM(oi.quantity) as total_sold,
        COALESCE(SUM(oi.quantity * oi.price), 0) as total_revenue,
        COALESCE(AVG(oi.price), 0) as avg_price
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status IN ('payed', 'shipped', 'completed')
      GROUP BY p.category
      ORDER BY total_revenue DESC
    `);
    
    const [categoryTrend] = await pool.query(`
      SELECT 
        p.category,
        DATE_FORMAT(o.created_at, '%Y-%m') as month,
        SUM(oi.quantity * oi.price) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status IN ('payed', 'shipped', 'completed')
      GROUP BY p.category, DATE_FORMAT(o.created_at, '%Y-%m')
      ORDER BY month DESC, revenue DESC
    `);
    
    return successResponse(res, {
      category_stats: categoryStats,
      category_trend: categoryTrend
    }, '查询成功');
  } catch (error) {
    console.error('Get category analysis error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/anomaly-detection', authenticateToken, requireRole(['admin', 'sales']), async (req, res) => {
  try {
    const [largeOrders] = await pool.query(`
      SELECT o.id, o.user_id, u.username, o.total_amount, o.status, o.created_at
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.total_amount > (SELECT AVG(total_amount) * 3 FROM orders WHERE status IN ('payed', 'shipped', 'completed'))
      AND o.status IN ('payed', 'shipped', 'completed')
      ORDER BY o.total_amount DESC
      LIMIT 10
    `);
    
    const [rapidPurchases] = await pool.query(`
      SELECT user_id, COUNT(*) as order_count, MIN(created_at) as first_order, MAX(created_at) as last_order
      FROM orders
      WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
      GROUP BY user_id
      HAVING COUNT(*) > 3
    `);
    
    const [lowStockProducts] = await pool.query(`
      SELECT id, name, category, stock, price
      FROM products
      WHERE stock < 10 AND status = 'available'
      ORDER BY stock ASC
      LIMIT 10
    `);
    
    return successResponse(res, {
      large_orders: largeOrders,
      rapid_purchases: rapidPurchases,
      low_stock_products: lowStockProducts
    }, '查询成功');
  } catch (error) {
    console.error('Get anomaly detection error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/inventory-alert', authenticateToken, requireRole(['admin', 'sales']), async (req, res) => {
  try {
    const { threshold = 10 } = req.query;
    
    const [lowStock] = await pool.query(`
      SELECT p.id, p.name, p.category, p.stock, p.price,
        COALESCE(SUM(oi.quantity), 0) as avg_daily_sales
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
      WHERE p.stock <= ? AND p.status = 'available'
      GROUP BY p.id, p.name, p.category, p.stock, p.price
      ORDER BY p.stock ASC
    `, [parseInt(threshold)]);
    
    const [outOfStock] = await pool.query(`
      SELECT id, name, category, price
      FROM products
      WHERE stock = 0 AND status = 'available'
    `);
    
    return successResponse(res, {
      low_stock: lowStock,
      out_of_stock: outOfStock
    }, '查询成功');
  } catch (error) {
    console.error('Get inventory alert error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/order-status-stats', authenticateToken, requireRole(['admin', 'sales']), async (req, res) => {
  try {
    const [statusStats] = await pool.query(`
      SELECT 
        status,
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(AVG(total_amount), 0) as avg_amount
      FROM orders
      GROUP BY status
      ORDER BY order_count DESC
    `);
    
    const [recentTrend] = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        status,
        COUNT(*) as count
      FROM orders
      WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at), status
      ORDER BY date DESC, status
    `);
    
    return successResponse(res, {
      status_stats: statusStats,
      recent_trend: recentTrend
    }, '查询成功');
  } catch (error) {
    console.error('Get order status stats error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/sales-performance', authenticateToken, requireRole(['admin', 'sales']), async (req, res) => {
  try {
    const [salesStats] = await pool.query(`
      SELECT 
        u.id,
        u.username,
        COUNT(DISTINCT o.id) as order_count,
        COALESCE(SUM(o.total_amount), 0) as total_revenue,
        COALESCE(AVG(o.total_amount), 0) as avg_order_value,
        COUNT(DISTINCT o.user_id) as customer_count
      FROM users u
      LEFT JOIN orders o ON u.id = o.sales_user_id AND o.status IN ('payed', 'shipped', 'completed')
      WHERE u.role = 'sales'
      GROUP BY u.id, u.username
      ORDER BY total_revenue DESC
    `);
    
    const [todayStats] = await pool.query(`
      SELECT 
        COUNT(DISTINCT o.user_id) as new_customers,
        COUNT(o.id) as orders,
        COALESCE(SUM(o.total_amount), 0) as revenue
      FROM orders o
      WHERE DATE(o.created_at) = CURDATE() 
        AND o.status IN ('payed', 'shipped', 'completed')
    `);
    
    const [monthStats] = await pool.query(`
      SELECT 
        COUNT(DISTINCT o.user_id) as new_customers,
        COUNT(o.id) as orders,
        COALESCE(SUM(o.total_amount), 0) as revenue
      FROM orders o
      WHERE DATE_FORMAT(o.created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
        AND o.status IN ('payed', 'shipped', 'completed')
    `);
    
    return successResponse(res, {
      sales_performance: salesStats,
      today: todayStats[0],
      this_month: monthStats[0]
    }, '查询成功');
  } catch (error) {
    console.error('Get sales performance error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/user-behavior', authenticateToken, requireRole(['admin', 'sales']), async (req, res) => {
  try {
    const [behaviorStats] = await pool.query(`
      SELECT 
        behavior_type,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as user_count
      FROM user_behavior
      WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY behavior_type
    `);
    
    const [topViewed] = await pool.query(`
      SELECT p.id, p.name, p.category, COUNT(*) as view_count
      FROM user_behavior ub
      JOIN products p ON ub.product_id = p.id
      WHERE ub.behavior_type = 'view' AND ub.created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY p.id, p.name, p.category
      ORDER BY view_count DESC
      LIMIT 10
    `);
    
    const [userActivity] = await pool.query(`
      SELECT 
        user_id,
        COUNT(*) as action_count,
        COUNT(DISTINCT product_id) as product_count
      FROM user_behavior
      WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY user_id
      ORDER BY action_count DESC
      LIMIT 20
    `);
    
    return successResponse(res, {
      behavior_stats: behaviorStats,
      top_viewed: topViewed,
      user_activity: userActivity
    }, '查询成功');
  } catch (error) {
    console.error('Get user behavior error:', error);
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

router.post('/behavior', authenticateToken, async (req, res) => {
  try {
    const { id: user_id } = req.user;
    const { product_id, behavior_type, duration_seconds = 0 } = req.body;
    
    if (!product_id || !behavior_type) {
      return errorResponse(res, '参数错误', 400);
    }
    
    await pool.query(
      'INSERT INTO user_behavior (user_id, product_id, behavior_type, duration_seconds) VALUES (?, ?, ?, ?)',
      [user_id, product_id, behavior_type, duration_seconds]
    );
    
    return successResponse(res, null, '行为记录成功');
  } catch (error) {
    console.error('Record behavior error:', error);
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

router.get('/merchant-overview', authenticateToken, requireRole(['sales', 'admin']), async (req, res) => {
  try {
    const { id: user_id, role } = req.user;
    
    let productCondition = '';
    let orderCondition = '';
    
    if (role === 'sales') {
      productCondition = 'WHERE sales_user_id = ?';
      orderCondition = 'AND o.sales_user_id = ?';
    }
    
    const [totalProducts] = await pool.query(
      `SELECT COUNT(*) as count FROM products ${productCondition}`,
      role === 'sales' ? [user_id] : []
    );
    
    const [totalOrders] = await pool.query(
      `SELECT COUNT(*) as count FROM orders o WHERE 1=1 ${orderCondition}`,
      role === 'sales' ? [user_id] : []
    );
    
    const [totalRevenue] = await pool.query(
      `SELECT COALESCE(SUM(o.total_amount), 0) as total FROM orders o WHERE o.status = 'completed' ${orderCondition}`,
      role === 'sales' ? [user_id] : []
    );
    
    const [topProducts] = await pool.query(`
      SELECT p.id, p.name, p.category, COUNT(oi.id) as order_count, SUM(oi.quantity) as total_sold
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'completed'
      ${role === 'sales' ? 'WHERE p.sales_user_id = ?' : ''}
      GROUP BY p.id, p.name, p.category
      ORDER BY total_sold DESC
      LIMIT 10
    `, role === 'sales' ? [user_id] : []);
    
    return successResponse(res, {
      total_products: totalProducts[0].count,
      total_orders: totalOrders[0].count,
      total_revenue: parseFloat(totalRevenue[0].total),
      top_products: topProducts
    }, '查询成功');
  } catch (error) {
    console.error('Get merchant overview error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/sales-forecast', authenticateToken, requireRole(['sales', 'admin']), async (req, res) => {
  try {
    const { id: user_id, role } = req.user;
    const { period = 'week' } = req.query;
    
    let condition = '';
    let params = [];
    
    if (role === 'sales') {
      condition = 'WHERE o.sales_user_id = ?';
      params.push(user_id);
    }
    
    const intervalDays = period === 'week' ? 7 : period === 'month' ? 30 : 1;
    
    const [historicalData] = await pool.query(`
      SELECT DATE(o.created_at) as date, SUM(o.total_amount) as revenue, COUNT(*) as order_count
      FROM orders o
      ${condition}
      AND o.status = 'completed'
      AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(o.created_at)
      ORDER BY date
    `, [...params, intervalDays * 4]);
    
    const forecast = [];
    if (historicalData.length > 0) {
      const avgRevenue = historicalData.reduce((sum, d) => sum + parseFloat(d.revenue), 0) / historicalData.length;
      const avgOrders = historicalData.reduce((sum, d) => sum + d.order_count, 0) / historicalData.length;
      
      for (let i = 1; i <= 7; i++) {
        const lastDate = new Date(historicalData[historicalData.length - 1].date);
        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + i);
        
        const variance = (Math.random() - 0.5) * 0.2 * avgRevenue;
        forecast.push({
          date: nextDate.toISOString().split('T')[0],
          predicted_revenue: Math.max(0, avgRevenue + variance),
          predicted_orders: Math.round(avgOrders)
        });
      }
    }
    
    return successResponse(res, {
      historical: historicalData,
      forecast: forecast,
      period: period
    }, '查询成功');
  } catch (error) {
    console.error('Get sales forecast error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/geo-distribution', authenticateToken, requireRole(['sales', 'admin']), async (req, res) => {
  try {
    const [geoData] = await pool.query(`
      SELECT 
        COALESCE(u.city, '未知') as city,
        COUNT(DISTINCT u.id) as user_count,
        COALESCE(SUM(o.total_amount), 0) as total_purchase,
        COUNT(o.id) as order_count
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id AND o.status = 'completed'
      WHERE u.role = 'customer'
      GROUP BY city
      ORDER BY user_count DESC
      LIMIT 20
    `);
    
    return successResponse(res, geoData, '查询成功');
  } catch (error) {
    console.error('Get geo distribution error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

router.get('/purchasing-power', authenticateToken, requireRole(['sales', 'admin']), async (req, res) => {
  try {
    const [powerData] = await pool.query(`
      SELECT 
        CASE 
          WHEN total_spent < 100 THEN '低消费'
          WHEN total_spent < 500 THEN '中消费'
          WHEN total_spent < 1000 THEN '中高消费'
          ELSE '高消费'
        END as tier,
        COUNT(*) as user_count
      FROM (
        SELECT u.id, COALESCE(SUM(o.total_amount), 0) as total_spent
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id AND o.status = 'completed'
        WHERE u.role = 'customer'
        GROUP BY u.id
      ) as user_spending
      GROUP BY tier
      ORDER BY 
        CASE tier
          WHEN '低消费' THEN 1
          WHEN '中消费' THEN 2
          WHEN '中高消费' THEN 3
          WHEN '高消费' THEN 4
        END
    `);
    
    return successResponse(res, powerData, '查询成功');
  } catch (error) {
    console.error('Get purchasing power error:', error);
    return errorResponse(res, '服务器内部错误', 500, error);
  }
});

module.exports = router;
