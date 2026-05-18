const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecommerce'
};

async function testAPI() {
  console.log('=== 开始验证修复 ===\n');

  const connection = await mysql.createConnection(DB_CONFIG);

  // 1. 查看订单数据
  console.log('1. 查询订单和销售关联数据:');
  const [orders] = await connection.execute(`
    SELECT o.id, o.user_id, o.sales_user_id, o.total_amount, o.status
    FROM orders o 
    WHERE o.status IN ('payed', 'shipped', 'completed')
    LIMIT 5
  `);
  console.log('订单示例:', orders);
  console.log();

  // 2. 查看 sales 用户列表:
  const [salesUsers] = await connection.execute(`
    SELECT u.id, u.username FROM users u WHERE u.role = 'sales'
  `);
  console.log('销售用户:', salesUsers);
  console.log();

  // 3. 检查 orders 表的销售业绩查询逻辑:
  console.log('3. 测试正确的销售业绩查询:');
  const [salesStats] = await connection.execute(`
    SELECT u.id, u.username,
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
  console.log('销售业绩统计:', salesStats);
  console.log();

  await connection.end();
  console.log('=== 数据库查询完成！');
}

testAPI().catch(console.error);
