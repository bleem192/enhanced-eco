const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'ecommerce_secret_key';

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: '请先登录' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, message: '登录已过期，请重新登录' });
  }

  try {
    const [rows] = await pool.execute('SELECT id, username, email, role FROM users WHERE id = ?', [decoded.id]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: '用户不存在' });
    }
    req.user = rows[0];
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    if (Array.isArray(roles)) {
      if (!roles.includes(userRole)) {
        return res.status(403).json({ success: false, message: '权限不足' });
      }
    } else {
      if (userRole !== roles) {
        return res.status(403).json({ success: false, message: '权限不足' });
      }
    }
    next();
  };
};

module.exports = { generateToken, verifyToken, authenticateToken, requireRole };
