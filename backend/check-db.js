require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkDatabase() {
  console.log('='.repeat(60));
  console.log('          数据库系统全面检查报告');
  console.log('='.repeat(60));
  
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ecommerce'
  });
  
  try {
    // 1. 数据库连接状态
    console.log('\n📊 1. 数据库连接状态');
    console.log('-'.repeat(40));
    const start = Date.now();
    const [rows] = await pool.execute('SELECT 1 as test');
    const latency = Date.now() - start;
    console.log('✅ 连接成功');
    console.log('   响应时间:', latency, 'ms');
    
    // 2. 表结构完整性检查
    console.log('\n📊 2. 表结构完整性检查');
    console.log('-'.repeat(40));
    const tables = ['users', 'products', 'orders', 'order_items', 'cart', 'user_behavior', 'operation_logs', 'recommendations'];
    for (const table of tables) {
      try {
        const [result] = await pool.execute('SHOW TABLES LIKE ?', [table]);
        if (result.length > 0) {
          console.log('✅ 表', table, '存在');
        } else {
          console.log('❌ 表', table, '缺失');
        }
      } catch (e) {
        console.log('❌ 表', table, '检查失败:', e.message);
      }
    }
    
    // 3. 索引使用情况
    console.log('\n📊 3. 索引使用情况');
    console.log('-'.repeat(40));
    const [indexes] = await pool.execute(
      'SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND INDEX_NAME != "PRIMARY"',
      ['ecommerce']
    );
    if (indexes.length > 0) {
      console.log('✅ 索引列表:');
      indexes.forEach(idx => {
        console.log('   - ' + idx.TABLE_NAME + '.' + idx.INDEX_NAME + ' (' + idx.COLUMN_NAME + ') ' + (idx.NON_UNIQUE ? '(非唯一)' : '(唯一)'));
      });
    } else {
      console.log('⚠️  没有非主键索引');
    }
    
    // 4. 数据统计
    console.log('\n📊 4. 数据统计');
    console.log('-'.repeat(40));
    for (const table of tables) {
      try {
        const [result] = await pool.execute('SELECT COUNT(*) as count FROM ' + table);
        console.log('   ', table.padEnd(15), ': ', result[0].count, '条记录');
      } catch (e) {
        console.log('   ', table.padEnd(15), ': ❌ 查询失败');
      }
    }
    
    // 5. 存储空间使用情况
    console.log('\n📊 5. 存储空间使用情况');
    console.log('-'.repeat(40));
    const [storage] = await pool.execute(
      'SELECT TABLE_NAME, DATA_LENGTH/1024/1024 as data_size_mb, INDEX_LENGTH/1024/1024 as index_size_mb, (DATA_LENGTH + INDEX_LENGTH)/1024/1024 as total_size_mb FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?',
      ['ecommerce']
    );
    let totalData = 0, totalIndex = 0;
    storage.forEach(row => {
      console.log('   ' + row.TABLE_NAME.padEnd(15) + ': 数据 ' + row.data_size_mb.toFixed(2) + ' MB, 索引 ' + row.index_size_mb.toFixed(2) + ' MB');
      totalData += row.data_size_mb;
      totalIndex += row.index_size_mb;
    });
    console.log('   '.padEnd(17) + '总计: ' + (totalData + totalIndex).toFixed(2) + ' MB (数据: ' + totalData.toFixed(2) + ' MB, 索引: ' + totalIndex.toFixed(2) + ' MB)');
    
    // 6. 查询性能测试
    console.log('\n📊 6. 查询性能测试');
    console.log('-'.repeat(40));
    const queries = [
      { name: '商品列表查询', sql: 'SELECT * FROM products WHERE status = ? LIMIT 10', params: ['available'] },
      { name: '用户查询', sql: 'SELECT * FROM users WHERE username = ?', params: ['admin'] },
      { name: '订单查询', sql: 'SELECT * FROM orders LIMIT 5', params: [] }
    ];
    
    for (const q of queries) {
      const start = Date.now();
      await pool.execute(q.sql, q.params);
      const latency = Date.now() - start;
      console.log('   ' + q.name.padEnd(12) + ': ' + latency + ' ms');
    }
    
    // 7. 数据库状态信息
    console.log('\n📊 7. 数据库状态信息');
    console.log('-'.repeat(40));
    const [status] = await pool.execute('SHOW STATUS LIKE "Threads_connected"');
    console.log('   当前连接数:', status[0]?.Value || '未知');
    
    // 8. 配置信息
    console.log('\n📊 8. 数据库配置信息');
    console.log('-'.repeat(40));
    const [version] = await pool.execute('SELECT VERSION()');
    console.log('   数据库版本:', version[0][0]['VERSION()']);
    console.log('   数据库名:', process.env.DB_NAME || 'ecommerce');
    console.log('   连接池大小:', '10');
    
    console.log('\n' + '='.repeat(60));
    console.log('              检查完成');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.log('❌ 数据库连接失败:', error.message);
    process.exit(1);
  }
}

checkDatabase();
