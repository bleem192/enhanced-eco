require('dotenv').config();
const { pool } = require('../config/database');

async function testConnection() {
  console.log('=== Database Connection Test ===\n');
  
  console.log('Environment:');
  console.log('  DB_HOST:', process.env.DB_HOST);
  console.log('  DB_USER:', process.env.DB_USER);
  console.log('  DB_NAME:', process.env.DB_NAME);
  console.log('  PORT:', process.env.PORT);
  console.log('');
  
  try {
    console.log('1. Testing database connection...');
    const [test] = await pool.query('SELECT 1 as test');
    console.log('   ✓ Database connected successfully\n');
    
    console.log('2. Checking tables...');
    const [tables] = await pool.query('SHOW TABLES');
    console.log(`   ✓ Found ${tables.length} tables\n`);
    
    console.log('3. Checking users table...');
    const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`   ✓ Users table has ${users[0].count} records\n`);
    
    console.log('4. Checking products table...');
    const [products] = await pool.query('SELECT COUNT(*) as count FROM products');
    console.log(`   ✓ Products table has ${products[0].count} records\n`);
    
    console.log('5. Checking orders table...');
    const [orders] = await pool.query('SELECT COUNT(*) as count FROM orders');
    console.log(`   ✓ Orders table has ${orders[0].count} records\n`);
    
    console.log('=== All Tests Passed ===');
    console.log('Database connection is working correctly!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection error:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    console.error('   Errno:', error.errno);
    if (error.sqlMessage) {
      console.error('   SQL Message:', error.sqlMessage);
    }
    process.exit(1);
  }
}

testConnection();
