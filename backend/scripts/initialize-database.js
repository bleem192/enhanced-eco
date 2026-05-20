const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecommerce'
};

const log = (message, level = 'info') => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
};

const createTables = async (connection) => {
  log('Creating database tables...');
  
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(50) NOT NULL UNIQUE,
      email VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('customer', 'sales', 'admin') DEFAULT 'customer',
      status ENUM('active', 'inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  log('✓ users table created');

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(50) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      stock INT DEFAULT 0,
      description TEXT,
      image_url VARCHAR(500),
      status ENUM('available', 'unavailable') DEFAULT 'available',
      sales_user_id INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (sales_user_id) REFERENCES users(id)
    )
  `);
  log('✓ products table created');

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(36) PRIMARY KEY,
      user_id INT NOT NULL,
      total_amount DECIMAL(10, 2) NOT NULL,
      status ENUM('pending', 'payed', 'shipped', 'completed', 'canceled') DEFAULT 'pending',
      shipping_address TEXT,
      payment_method VARCHAR(50),
      sales_user_id INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (sales_user_id) REFERENCES users(id)
    )
  `);
  log('✓ orders table created');

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT PRIMARY KEY AUTO_INCREMENT,
      order_id VARCHAR(36) NOT NULL,
      product_id INT NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      quantity INT NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);
  log('✓ order_items table created');

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS cart (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      UNIQUE KEY unique_cart_item (user_id, product_id)
    )
  `);
  log('✓ cart table created');

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS user_behavior (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      product_id INT NOT NULL,
      behavior_type ENUM('view', 'click', 'add_cart', 'purchase', 'like') NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);
  log('✓ user_behavior table created');

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS operation_logs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      username VARCHAR(50) NOT NULL,
      operation VARCHAR(255) NOT NULL,
      module VARCHAR(50),
      ip_address VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  log('✓ operation_logs table created');

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS recommendations (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      product_id INT NOT NULL,
      score DECIMAL(5, 4) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      UNIQUE KEY unique_recommendation (user_id, product_id)
    )
  `);
  log('✓ recommendations table created');

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS user_behavior_logs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT,
      username VARCHAR(50) NOT NULL,
      behavior_type ENUM('view', 'view_duration', 'click', 'add_cart', 'purchase', 'like') NOT NULL,
      product_id INT,
      product_name VARCHAR(255),
      category VARCHAR(50),
      page_url VARCHAR(500),
      session_id VARCHAR(100),
      duration INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);
  log('✓ user_behavior_logs table created');

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS purchase_logs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      username VARCHAR(50) NOT NULL,
      order_id VARCHAR(36) NOT NULL,
      product_id INT NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      category VARCHAR(50) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      quantity INT NOT NULL,
      total_amount DECIMAL(10, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);
  log('✓ purchase_logs table created');

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS product_categories (
      id INT PRIMARY KEY AUTO_INCREMENT,
      sales_user_id INT NOT NULL,
      name VARCHAR(50) NOT NULL,
      description VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sales_user_id) REFERENCES users(id),
      UNIQUE KEY unique_category_per_user (sales_user_id, name)
    )
  `);
  log('✓ product_categories table created');

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS login_logs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT,
      username VARCHAR(50) NOT NULL,
      ip_address VARCHAR(50),
      user_agent VARCHAR(500),
      login_status ENUM('success', 'failed') DEFAULT 'success',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  log('✓ login_logs table created');

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS system_config (
      id INT PRIMARY KEY AUTO_INCREMENT,
      config_key VARCHAR(100) NOT NULL UNIQUE,
      config_value TEXT,
      config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
      description VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  log('✓ system_config table created');

  log('All database tables created successfully');
};

const insertInitialUsers = async (connection) => {
  log('Inserting initial users...');

  const [adminResult] = await connection.execute('SELECT * FROM users WHERE username = ?', ['admin']);
  if (adminResult.length === 0) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await connection.execute(
      'INSERT INTO users (username, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
      ['admin', 'admin@example.com', hashedPassword, 'admin', 'active']
    );
    log('✓ Admin user created');
  } else {
    log('✓ Admin user already exists, skipping');
  }

  const [sales1Result] = await connection.execute('SELECT * FROM users WHERE username = ?', ['sales1']);
  if (sales1Result.length === 0) {
    const hashedPassword = await bcrypt.hash('sales123', 10);
    await connection.execute(
      'INSERT INTO users (username, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
      ['sales1', 'sales1@example.com', hashedPassword, 'sales', 'active']
    );
    log('✓ Sales1 user created');
  } else {
    log('✓ Sales1 user already exists, skipping');
  }

  const [sales2Result] = await connection.execute('SELECT * FROM users WHERE username = ?', ['sales2']);
  if (sales2Result.length === 0) {
    const hashedPassword = await bcrypt.hash('sales123', 10);
    await connection.execute(
      'INSERT INTO users (username, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
      ['sales2', 'sales2@example.com', hashedPassword, 'sales', 'active']
    );
    log('✓ Sales2 user created');
  } else {
    log('✓ Sales2 user already exists, skipping');
  }

  const [customerResult] = await connection.execute('SELECT * FROM users WHERE username = ?', ['customer1']);
  if (customerResult.length === 0) {
    const hashedPassword = await bcrypt.hash('customer123', 10);
    await connection.execute(
      'INSERT INTO users (username, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
      ['customer1', 'customer1@example.com', hashedPassword, 'customer', 'active']
    );
    log('✓ Customer1 user created');
  } else {
    log('✓ Customer1 user already exists, skipping');
  }

  log('Initial users inserted');
};

const insertSampleProducts = async (connection) => {
  log('Inserting sample products...');

  const [productsResult] = await connection.execute('SELECT COUNT(*) as count FROM products');
  if (productsResult[0].count > 0) {
    log('✓ Products already exist, skipping sample data');
    return;
  }

  const [salesUsers] = await connection.execute('SELECT id, username FROM users WHERE role = ?', ['sales']);
  
  const sales1Id = salesUsers.length > 0 ? salesUsers[0].id : null;
  const sales2Id = salesUsers.length > 1 ? salesUsers[1].id : sales1Id;

  const products = [
    {
      name: '智能手机',
      category: '电子产品',
      price: 2999.00,
      stock: 100,
      description: '高性能智能手机',
      status: 'available',
      sales_user_id: sales1Id
    },
    {
      name: '笔记本电脑',
      category: '电子产品',
      price: 5999.00,
      stock: 50,
      description: '轻薄笔记本电脑',
      status: 'available',
      sales_user_id: sales1Id
    },
    {
      name: '无线耳机',
      category: '电子产品',
      price: 599.00,
      stock: 200,
      description: '降噪无线耳机',
      status: 'available',
      sales_user_id: sales1Id
    },
    {
      name: '运动T恤',
      category: '服装',
      price: 129.00,
      stock: 300,
      description: '透气速干运动T恤',
      status: 'available',
      sales_user_id: sales2Id
    },
    {
      name: '牛仔裤',
      category: '服装',
      price: 299.00,
      stock: 150,
      description: '经典款牛仔裤',
      status: 'available',
      sales_user_id: sales2Id
    },
    {
      name: '运动鞋',
      category: '服装',
      price: 499.00,
      stock: 100,
      description: '轻便运动鞋',
      status: 'available',
      sales_user_id: sales2Id
    }
  ];

  for (const product of products) {
    await connection.execute(
      `INSERT INTO products (name, category, price, stock, description, status, sales_user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [product.name, product.category, product.price, product.stock, product.description, product.status, product.sales_user_id]
    );
  }

  log('✓ Sample products created');
};

const insertSystemConfig = async (connection) => {
  log('Inserting system configuration...');

  const configs = [
    {
      config_key: 'site_name',
      config_value: '电商平台',
      config_type: 'string',
      description: '网站名称'
    },
    {
      config_key: 'max_order_amount',
      config_value: '10000',
      config_type: 'number',
      description: '最大订单金额'
    },
    {
      config_key: 'enable_recommendations',
      config_value: 'true',
      config_type: 'boolean',
      description: '是否启用推荐系统'
    },
    {
      config_key: 'stock_alert_threshold',
      config_value: '10',
      config_type: 'number',
      description: '库存预警阈值'
    }
  ];

  for (const configItem of configs) {
    const [existing] = await connection.execute('SELECT * FROM system_config WHERE config_key = ?', [configItem.config_key]);
    if (existing.length === 0) {
      await connection.execute(
        'INSERT INTO system_config (config_key, config_value, config_type, description) VALUES (?, ?, ?, ?)',
        [configItem.config_key, configItem.config_value, configItem.config_type, configItem.description]
      );
      log(`✓ Config ${configItem.config_key} created`);
    } else {
      log(`✓ Config ${configItem.config_key} already exists, skipping`);
    }
  }

  log('System configuration inserted');
};

const insertSampleCategories = async (connection) => {
  log('Inserting sample categories...');

  const [salesUsers] = await connection.execute('SELECT id, username FROM users WHERE role = ?', ['sales']);

  for (const salesUser of salesUsers) {
    const [existing] = await connection.execute(
      'SELECT * FROM product_categories WHERE sales_user_id = ?',
      [salesUser.id]
    );

    if (existing.length === 0) {
      const categories = [
        { name: '电子产品', description: '电子数码产品' },
        { name: '服装', description: '服饰服装' },
        { name: '食品', description: '食品饮料' },
        { name: '家居', description: '家居用品' }
      ];

      for (const category of categories) {
        await connection.execute(
          'INSERT INTO product_categories (sales_user_id, name, description) VALUES (?, ?, ?)',
          [salesUser.id, category.name, category.description]
        );
      }

      log(`✓ Sample categories for ${salesUser.username} created`);
    } else {
      log(`✓ Categories for ${salesUser.username} already exist, skipping`);
    }
  }
};

const verifyInitialization = async (connection) => {
  log('Verifying initialization...');

  let allPassed = true;

  const [usersResult] = await connection.execute('SELECT COUNT(*) as count FROM users WHERE username IN (?, ?, ?, ?)',
    ['admin', 'sales1', 'sales2', 'customer1']);
  log(`✓ Users count: ${usersResult[0].count}/4`);

  const [productsResult] = await connection.execute('SELECT COUNT(*) as count FROM products');
  log(`✓ Products count: ${productsResult[0].count}`);

  const [configResult] = await connection.execute('SELECT COUNT(*) as count FROM system_config');
  log(`✓ System config count: ${configResult[0].count}`);

  const [tablesResult] = await connection.execute(`
    SELECT COUNT(*) as count 
    FROM information_schema.tables 
    WHERE table_schema = ?
  `, [config.database]);

  const expectedTables = ['users', 'products', 'orders', 'order_items', 'cart', 'user_behavior', 'operation_logs', 'recommendations', 'user_behavior_logs', 'purchase_logs', 'product_categories', 'login_logs', 'system_config'];
  
  for (const tableName of expectedTables) {
    const [tableExists] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = ?
    `, [config.database, tableName]);
    
    if (tableExists[0].count > 0) {
      log(`✓ Table ${tableName}: OK`);
    } else {
      log(`✗ Table ${tableName}: NOT FOUND`, 'error');
      allPassed = false;
    }
  }

  log(`Verification ${allPassed ? 'PASSED' : 'FAILED'}`);
  return allPassed;
};

const main = async () => {
  log('='.repeat(60));
  log('E-Commerce Database Initialization');
  log('='.repeat(60));

  let connection;

  try {
    log('Connecting to database server...');
    connection = await mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password
    });
    log('✓ Connected to database server');

    log(`Creating database ${config.database}...`);
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${config.database}`);
    log('✓ Database created or already exists');

    await connection.end();

    connection = await mysql.createConnection(config);
    log('✓ Connected to database');

    await createTables(connection);
    await insertInitialUsers(connection);
    await insertSystemConfig(connection);
    await insertSampleProducts(connection);
    await insertSampleCategories(connection);
    await verifyInitialization(connection);

    log('='.repeat(60));
    log('🎉 Database initialization completed successfully!');
    log('='.repeat(60));
    log('');
    log('Default login credentials:');
    log('  Admin:    admin / admin123');
    log('  Sales1:   sales1 / sales123');
    log('  Sales2:   sales2 / sales123');
    log('  Customer: customer1 / customer123');
    log('');

  } catch (error) {
    log(`Error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

if (require.main === module) {
  main();
}

module.exports = {
  createTables,
  insertInitialUsers,
  insertSampleProducts,
  insertSystemConfig,
  insertSampleCategories,
  verifyInitialization
};
