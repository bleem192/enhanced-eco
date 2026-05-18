const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetDatabase() {
  console.log('========================================');
  console.log('     数据库重置脚本');
  console.log('========================================\n');
  
  let connection;
  
  try {
    // 1. 连接数据库
    console.log('[1/5] 连接数据库...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ecommerce'
    });
    console.log('   ✅ 数据库连接成功\n');
    
    // 2. 禁用外键检查
    console.log('[2/5] 禁用外键约束...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    console.log('   ✅ 外键约束已禁用\n');
    
    // 3. 获取所有表名
    console.log('[3/5] 获取所有表...');
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE '%'"
    );
    const tableNames = tables.map(row => Object.values(row)[0]);
    console.log(`   发现 ${tableNames.length} 个表\n`);
    
    // 4. 清空所有表数据
    console.log('[4/5] 清空所有表数据...');
    for (const table of tableNames) {
      try {
        await connection.execute(`TRUNCATE TABLE ${table}`);
        console.log(`   ✅ 已清空: ${table}`);
      } catch (error) {
        console.log(`   ⚠️ 清空 ${table} 失败: ${error.message}`);
      }
    }
    console.log('');
    
    // 5. 启用外键检查
    console.log('[5/5] 启用外键约束...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('   ✅ 外键约束已启用\n');
    
    // 6. 创建管理员账户
    console.log('[6/6] 创建管理员账户...');
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await connection.execute(
      'INSERT INTO users (username, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
      ['admin', 'admin@example.com', hashedPassword, 'admin', 'active']
    );
    
    console.log('   ✅ 管理员账户创建成功');
    console.log('   - 用户名: admin');
    console.log('   - 密码: admin123');
    console.log('   - 邮箱: admin@example.com');
    console.log('   - 角色: admin');
    console.log('');
    
    // 验证管理员账户
    const [adminRow] = await connection.execute(
      'SELECT id, username, email, role, status FROM users WHERE username = ?',
      ['admin']
    );
    
    if (adminRow.length > 0) {
      console.log('✅ 验证成功: 管理员账户已创建');
      console.log(`   用户ID: ${adminRow[0].id}`);
      console.log(`   用户名: ${adminRow[0].username}`);
      console.log(`   角色: ${adminRow[0].role}`);
      console.log(`   状态: ${adminRow[0].status}`);
    } else {
      console.log('❌ 验证失败: 管理员账户未创建');
    }
    
    console.log('\n========================================');
    console.log('     数据库重置完成');
    console.log('========================================');
    
  } catch (error) {
    console.error('\n❌ 数据库重置失败:', error.message);
    console.error('错误详情:', error);
    // 确保启用外键检查
    if (connection) {
      await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n已关闭数据库连接');
    }
  }
}

resetDatabase();
