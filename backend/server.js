require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDatabase, initAdminUser } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products-enhanced');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin-enhanced');
const analysisRoutes = require('./routes/analysis-enhanced');
const behaviorRoutes = require('./routes/behavior-logs');
const categoryRoutes = require('./routes/categories');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/behavior', behaviorRoutes);
app.use('/api/categories', categoryRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

const startServer = async () => {
  try {
    await initDatabase();
    await initAdminUser();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});
