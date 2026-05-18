const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ecommerce'
  });

  console.log('开始更新数据库...');

  try {
    // 1. 为 orders 表添加 sales_user_id 字段
    console.log('1. 更新 orders 表...');
    try {
      await connection.execute(`
        ALTER TABLE orders ADD COLUMN sales_user_id INT DEFAULT NULL
        AFTER payment_method
      `);
      console.log('   ✓ orders.sales_user_id 字段已添加');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('   - orders.sales_user_id 字段已存在');
      } else {
        throw err;
      }
    }

    // 2. 为 products 表添加 sales_user_id 字段
    console.log('2. 更新 products 表...');
    try {
      await connection.execute(`
        ALTER TABLE products ADD COLUMN sales_user_id INT DEFAULT NULL
        AFTER status
      `);
      console.log('   ✓ products.sales_user_id 字段已添加');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('   - products.sales_user_id 字段已存在');
      } else {
        throw err;
      }
    }

    // 3. 创建 product_categories 表
    console.log('3. 创建 product_categories 表...');
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS product_categories (
          id INT PRIMARY KEY AUTO_INCREMENT,
          sales_user_id INT DEFAULT NULL,
          name VARCHAR(50) NOT NULL,
          description VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_category_per_user (sales_user_id, name)
        )
      `);
      console.log('   ✓ product_categories 表已创建');
    } catch (err) {
      if (err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('   - product_categories 表已存在');
      } else {
        throw err;
      }
    }

    // 4. 添加外键约束
    console.log('4. 添加外键约束...');
    try {
      await connection.execute(`
        ALTER TABLE orders 
        ADD CONSTRAINT fk_orders_sales_user 
        FOREIGN KEY (sales_user_id) REFERENCES users(id)
      `);
      console.log('   ✓ orders.sales_user_id 外键已添加');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_FK_DUP_NAME') {
        console.log('   - orders.sales_user_id 外键已存在');
      } else {
        console.log('   ⚠ 外键添加失败（可能已有数据约束）:', err.message);
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE products 
        ADD CONSTRAINT fk_products_sales_user 
        FOREIGN KEY (sales_user_id) REFERENCES users(id)
      `);
      console.log('   ✓ products.sales_user_id 外键已添加');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_FK_DUP_NAME') {
        console.log('   - products.sales_user_id 外键已存在');
      } else {
        console.log('   ⚠ 外键添加失败（可能已有数据约束）:', err.message);
      }
    }

    console.log('\n数据库更新完成！');

    // 验证更新
    console.log('\n验证更新结果:');
    const [ordersColumns] = await connection.execute('DESCRIBE orders');
    const hasSalesUserId = ordersColumns.some(col => col.Field === 'sales_user_id');
    console.log(`  orders 表 sales_user_id: ${hasSalesUserId ? '✓' : '✗'}`);

    const [productsColumns] = await connection.execute('DESCRIBE products');
    const hasProductsSalesUserId = productsColumns.some(col => col.Field === 'sales_user_id');
    console.log(`  products 表 sales_user_id: ${hasProductsSalesUserId ? '✓' : '✗'}`);

  } catch (error) {
    console.error('更新失败:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

updateDatabase();
