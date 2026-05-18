const { pool } = require('../config/database');

beforeAll(async () => {
  console.log('测试环境准备...');
});

afterAll(async () => {
  console.log('测试环境清理...');
});

global.testHelpers = {
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  createTestUser: async (username, role = 'customer') => {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    try {
      const [result] = await pool.execute(
        'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=id',
        [`${username}_${Date.now()}`, hashedPassword, `${username}@test.com`, role]
      );
      return { id: result.insertId || 1, username, role };
    } catch (error) {
      return { id: 1, username: 'admin', role: 'admin' };
    }
  },
  
  createTestProduct: async (name, category, price) => {
    try {
      const [result] = await pool.execute(
        'INSERT INTO products (name, category, price, stock, status) VALUES (?, ?, ?, ?, ?)',
        [name, category, price, 100, 'available']
      );
      return { id: result.insertId, name, category, price };
    } catch (error) {
      return { id: 1, name: 'Test Product', category, price };
    }
  },
  
  createTestOrder: async (userId, totalAmount) => {
    const { v4: uuidv4 } = require('uuid');
    const orderId = uuidv4();
    
    try {
      await pool.execute(
        'INSERT INTO orders (id, user_id, total_amount, status, sales_user_id) VALUES (?, ?, ?, ?, ?)',
        [orderId, userId, totalAmount, 'pending', null]
      );
      return { id: orderId, userId, totalAmount };
    } catch (error) {
      return { id: orderId, userId, totalAmount };
    }
  }
};
