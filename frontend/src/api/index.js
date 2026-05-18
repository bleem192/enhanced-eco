import axios from 'axios'

const instance = axios.create({
  baseURL: '/api',
  timeout: 10000
})

instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

instance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default {
  auth: {
    login: (data) => instance.post('/auth/login', data),
    register: (data) => instance.post('/auth/register', data),
    logout: () => instance.post('/auth/logout'),
    getProfile: () => instance.get('/auth/profile'),
    resetPassword: (data) => instance.post('/auth/password/reset', data),
    getLoginLogs: (params) => instance.get('/auth/login-logs', { params })
  },
  products: {
    getProducts: (params) => instance.get('/products', { params }),
    getProduct: (id) => instance.get(`/products/${id}`),
    getCategories: () => instance.get('/products/categories'),
    createProduct: (data) => instance.post('/products', data),
    updateProduct: (id, data) => instance.put(`/products/${id}`, data),
    deleteProduct: (id) => instance.delete(`/products/${id}`),
    updatePrice: (id, data) => instance.put(`/products/${id}/price`, data),
    getPriceHistory: (id, params) => instance.get(`/products/${id}/price-history`, { params }),
    updateStock: (id, data) => instance.put(`/products/${id}/stock`, data),
    getStockHistory: (id, params) => instance.get(`/products/${id}/stock-history`, { params })
  },
  cart: {
    getCart: () => instance.get('/cart'),
    addToCart: (data) => instance.post('/cart/add', data),
    updateCartItem: (id, data) => instance.put(`/cart/${id}`, data),
    removeFromCart: (id) => instance.delete(`/cart/${id}`),
    clearCart: () => instance.delete('/cart')
  },
  orders: {
    getOrders: (params) => instance.get('/orders', { params }),
    getOrder: (id) => instance.get(`/orders/${id}`),
    createOrder: (data) => instance.post('/orders', data),
    updateOrder: (id, data) => instance.put(`/orders/${id}`, data)
  },
  analysis: {
    getOverview: () => instance.get('/analysis'),
    getUserProfile: () => instance.get('/analysis/user-profile'),
    getCustomerAnalysis: () => instance.get('/analysis/customer-analysis'),
    getSalesTrend: (params) => instance.get('/analysis/sales-trend', { params }),
    getSalesRanking: (params) => instance.get('/analysis/sales-ranking', { params }),
    getCategoryAnalysis: () => instance.get('/analysis/category-analysis'),
    getOrderStatusStats: () => instance.get('/analysis/order-status-stats'),
    getInventoryAlert: (params) => instance.get('/analysis/inventory-alert', { params }),
    getAnomalyDetection: () => instance.get('/analysis/anomaly-detection'),
    getSalesPerformance: () => instance.get('/analysis/sales-performance'),
    getUserBehavior: () => instance.get('/analysis/user-behavior'),
    getRecommendations: () => instance.get('/analysis/recommendations'),
    recordBehavior: (data) => instance.post('/analysis/behavior', data),
    getAnalytics: () => instance.get('/analysis/analytics'),
    triggerRecommend: (data) => instance.post('/analysis/trigger-recommend', data)
  },
  admin: {
    getUsers: (params) => instance.get('/admin/users', { params }),
    createUser: (data) => instance.post('/admin/users', data),
    updateUser: (id, data) => instance.put(`/admin/users/${id}`, data),
    deleteUser: (id) => instance.delete(`/admin/users/${id}`),
    resetPassword: (id, data) => instance.post(`/admin/users/${id}/reset-password`, data),
    getUserLoginLogs: (id, params) => instance.get(`/admin/users/${id}/login-logs`, { params }),
    getSalesStats: () => instance.get('/admin/sales-stats'),
    getSalesPerformance: () => instance.get('/admin/sales-performance'),
    getLogs: (params) => instance.get('/admin/logs', { params }),
    getLoginLogs: (params) => instance.get('/admin/logs/login', { params }),
    getReports: (params) => instance.get('/admin/reports/export', { params })
  },
  behavior: {
    recordView: (data) => instance.post('/behavior/view', data),
    recordViewDuration: (data) => instance.post('/behavior/view-duration', data),
    recordPurchase: (data) => instance.post('/behavior/purchase', data),
    queryLogs: (params) => instance.get('/behavior/query', { params }),
    queryPurchaseLogs: (params) => instance.get('/behavior/purchase/query', { params }),
    getStats: () => instance.get('/behavior/stats'),
    exportLogs: (params) => instance.get('/behavior/query', { params, responseType: 'blob' }),
    exportPurchaseLogs: (params) => instance.get('/behavior/purchase/query', { params, responseType: 'blob' })
  }
}
