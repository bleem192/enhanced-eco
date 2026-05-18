<template>
  <div class="sales-container">
    <h1>销售管理</h1>
    
    <div class="tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.value"
        :class="['tab-btn', { active: activeTab === tab.value }]"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="activeTab === 'products'" class="tab-content">
      <div class="add-product">
        <button class="add-btn" @click="showAddModal = true">+ 添加商品</button>
      </div>
      <div class="products-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>图片</th>
              <th>商品名称</th>
              <th>分类</th>
              <th>价格</th>
              <th>库存</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in products" :key="product.id">
              <td>{{ product.id }}</td>
              <td><img :src="product.image_url || 'https://via.placeholder.com/50'" :alt="product.name" class="product-thumb" width="50" height="50" /></td>
              <td>{{ product.name }}</td>
              <td>{{ product.category }}</td>
              <td>¥{{ parseFloat(product.price).toFixed(2) }}</td>
              <td :class="{ low: product.stock < 10 }">{{ product.stock }}</td>
              <td>{{ product.status === 'available' ? '在售' : '下架' }}</td>
              <td>
                <button class="edit-btn" @click="editProduct(product)" aria-label="编辑商品 {{ product.name }}">编辑</button>
                <button class="price-btn" @click="openPriceModal(product)" aria-label="调整商品 {{ product.name }} 价格">调价</button>
                <button class="stock-btn" @click="openStockModal(product)" aria-label="管理商品 {{ product.name }} 库存">库存</button>
                <button class="delete-btn" @click="confirmDelete(product)" aria-label="下架商品 {{ product.name }}">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="activeTab === 'orders'" class="tab-content">
      <div class="orders-table">
        <table>
          <thead>
            <tr>
              <th>订单号</th>
              <th>用户ID</th>
              <th>金额</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in orders" :key="order.id">
              <td>{{ order.id.substring(0, 8) }}...</td>
              <td>{{ order.user_id }}</td>
              <td>¥{{ parseFloat(order.total_amount).toFixed(2) }}</td>
              <td>{{ getStatusText(order.status) }}</td>
              <td>{{ formatTime(order.created_at) }}</td>
              <td>
                <button 
                  v-if="order.status === 'pending'" 
                  class="status-btn" 
                  @click="updateOrderStatus(order.id, 'payed')"
                >
                  确认支付
                </button>
                <button 
                  v-if="order.status === 'payed'" 
                  class="status-btn" 
                  @click="updateOrderStatus(order.id, 'shipped')"
                >
                  确认发货
                </button>
                <button 
                  v-if="order.status === 'shipped'" 
                  class="status-btn" 
                  @click="updateOrderStatus(order.id, 'completed')"
                >
                  完成订单
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="activeTab === 'stats'" class="tab-content">
      <div class="stats-cards">
        <div class="stat-card">
          <span class="stat-icon">💰</span>
          <div class="stat-info">
            <p class="stat-value">¥{{ parseFloat(stats.total_revenue || 0).toFixed(2) }}</p>
            <p class="stat-label">总销售额</p>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">📦</span>
          <div class="stat-info">
            <p class="stat-value">{{ stats.total_orders || 0 }}</p>
            <p class="stat-label">订单总数</p>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">👥</span>
          <div class="stat-info">
            <p class="stat-value">{{ stats.unique_customers || 0 }}</p>
            <p class="stat-label">客户数</p>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">🛒</span>
          <div class="stat-info">
            <p class="stat-value">¥{{ parseFloat(stats.avg_order_value || 0).toFixed(2) }}</p>
            <p class="stat-label">平均订单额</p>
          </div>
        </div>
      </div>

      <div class="stats-section">
        <h3>销售趋势</h3>
        <div class="period-selector">
          <button 
            v-for="period in ['week', 'month', 'year']" 
            :key="period"
            :class="['period-btn', { active: currentPeriod === period }]"
            @click="fetchSalesTrend(period)"
          >
            {{ period === 'week' ? '周' : period === 'month' ? '月' : '年' }}
          </button>
        </div>
        <div class="trend-chart">
          <div v-for="item in salesTrend" :key="item.period" class="trend-item">
            <span>{{ item.period }}</span>
            <span>¥{{ parseFloat(item.revenue).toFixed(2) }}</span>
            <span>{{ item.order_count }}单</span>
          </div>
        </div>
      </div>

      <div class="stats-section">
        <h3>类别销售分布</h3>
        <div class="category-dist">
          <div v-for="cat in categoryDistribution" :key="cat.name" class="category-item">
            <span>{{ cat.name }}</span>
            <span>¥{{ parseFloat(cat.value).toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <div class="stats-section">
        <h3>库存预警</h3>
        <div class="alert-list">
          <div v-if="inventoryAlerts.low_stock?.length === 0 && inventoryAlerts.out_of_stock?.length === 0" class="no-alert">
            暂无库存预警
          </div>
          <div v-for="item in inventoryAlerts.low_stock" :key="item.id" class="alert-item low">
            <span>{{ item.name }}</span>
            <span class="stock-count">库存: {{ item.stock }}</span>
          </div>
          <div v-for="item in inventoryAlerts.out_of_stock" :key="item.id" class="alert-item critical">
            <span>{{ item.name }}</span>
            <span class="stock-count">缺货</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'behavior'" class="tab-content">
      <div class="stats-section">
        <h3>用户行为统计</h3>
        <div class="behavior-stats">
          <div v-for="stat in behaviorStats" :key="stat.behavior_type" class="behavior-item">
            <span class="behavior-type">{{ getBehaviorText(stat.behavior_type) }}</span>
            <span>{{ stat.count }}次</span>
            <span>{{ stat.user_count }}人</span>
          </div>
        </div>
      </div>

      <div class="stats-section">
        <h3>热门浏览商品</h3>
        <div class="top-viewed">
          <div v-for="(item, index) in topViewed" :key="item.id" class="viewed-item">
            <span class="rank">{{ index + 1 }}</span>
            <span class="name">{{ item.name }}</span>
            <span class="category">{{ item.category }}</span>
            <span class="count">{{ item.view_count }}次</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'logs'" class="tab-content">
      <div class="logs-tabs">
        <button 
          v-for="tab in [{ label: '浏览日志', value: 'behavior' }, { label: '购买日志', value: 'purchase' }]"
          :key="tab.value"
          :class="['logs-tab-btn', { active: activeLogsTab === tab.value }]"
          @click="activeLogsTab = tab.value; activeLogsTab === 'behavior' ? fetchLogs() : fetchPurchaseLogs()"
        >
          {{ tab.label }}
        </button>
        <button class="export-btn" @click="activeLogsTab === 'behavior' ? exportLogs() : exportPurchaseLogs()">
          导出CSV
        </button>
      </div>

      <div v-if="activeLogsTab === 'behavior'" class="logs-content">
        <div class="filters">
          <input v-model="logsFilter.start_time" type="datetime-local" placeholder="开始时间" />
          <input v-model="logsFilter.end_time" type="datetime-local" placeholder="结束时间" />
          <input v-model="logsFilter.username" type="text" placeholder="用户名" />
          <input v-model="logsFilter.category" type="text" placeholder="商品分类" />
          <select v-model="logsFilter.behavior_type">
            <option value="">所有行为</option>
            <option value="view">浏览</option>
            <option value="view_duration">停留</option>
          </select>
          <button class="filter-btn" @click="logsPage = 1; fetchLogs()">搜索</button>
        </div>

        <table class="logs-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>用户</th>
              <th>行为类型</th>
              <th>商品</th>
              <th>分类</th>
              <th>停留时长</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id">
              <td>{{ log.id }}</td>
              <td>{{ log.username }}</td>
              <td>{{ log.behavior_type === 'view' ? '浏览' : '停留' }}</td>
              <td>{{ log.product_name || '-' }}</td>
              <td>{{ log.category || '-' }}</td>
              <td>{{ log.duration ? log.duration + '秒' : '-' }}</td>
              <td>{{ formatTime(log.created_at) }}</td>
            </tr>
          </tbody>
        </table>

        <div v-if="logsTotal > logsLimit" class="pagination">
          <button :disabled="logsPage === 1" @click="logsPage--; fetchLogs()">上一页</button>
          <span>第 {{ logsPage }} / {{ Math.ceil(logsTotal / logsLimit) }} 页</span>
          <button :disabled="logsPage >= Math.ceil(logsTotal / logsLimit)" @click="logsPage++; fetchLogs()">下一页</button>
        </div>
      </div>

      <div v-if="activeLogsTab === 'purchase'" class="logs-content">
        <div class="filters">
          <input v-model="purchaseLogsFilter.start_time" type="datetime-local" placeholder="开始时间" />
          <input v-model="purchaseLogsFilter.end_time" type="datetime-local" placeholder="结束时间" />
          <input v-model="purchaseLogsFilter.username" type="text" placeholder="用户名" />
          <input v-model="purchaseLogsFilter.category" type="text" placeholder="商品分类" />
          <button class="filter-btn" @click="purchaseLogsPage = 1; fetchPurchaseLogs()">搜索</button>
        </div>

        <table class="logs-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>用户</th>
              <th>订单号</th>
              <th>商品</th>
              <th>分类</th>
              <th>单价</th>
              <th>数量</th>
              <th>订单总额</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in purchaseLogs" :key="log.id">
              <td>{{ log.id }}</td>
              <td>{{ log.username }}</td>
              <td>{{ log.order_id.substring(0, 8) }}...</td>
              <td>{{ log.product_name }}</td>
              <td>{{ log.category }}</td>
              <td>¥{{ parseFloat(log.price).toFixed(2) }}</td>
              <td>{{ log.quantity }}</td>
              <td>¥{{ parseFloat(log.total_amount).toFixed(2) }}</td>
              <td>{{ formatTime(log.created_at) }}</td>
            </tr>
          </tbody>
        </table>

        <div v-if="purchaseLogsTotal > purchaseLogsLimit" class="pagination">
          <button :disabled="purchaseLogsPage === 1" @click="purchaseLogsPage--; fetchPurchaseLogs()">上一页</button>
          <span>第 {{ purchaseLogsPage }} / {{ Math.ceil(purchaseLogsTotal / purchaseLogsLimit) }} 页</span>
          <button :disabled="purchaseLogsPage >= Math.ceil(purchaseLogsTotal / purchaseLogsLimit)" @click="purchaseLogsPage++; fetchPurchaseLogs()">下一页</button>
        </div>
      </div>
    </div>

    <div v-if="showAddModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingProduct ? '编辑商品' : '添加商品' }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <form @submit.prevent="handleSaveProduct" class="modal-form">
          <div class="form-group">
            <label>商品名称</label>
            <input v-model="formData.name" type="text" required />
          </div>
          <div class="form-group">
            <label>分类</label>
            <input v-model="formData.category" type="text" required />
          </div>
          <div class="form-group">
            <label>价格</label>
            <input v-model.number="formData.price" type="number" step="0.01" required />
          </div>
          <div class="form-group">
            <label>库存</label>
            <input v-model.number="formData.stock" type="number" required />
          </div>
          <div class="form-group">
            <label>描述</label>
            <textarea v-model="formData.description"></textarea>
          </div>
          <div class="form-group">
            <label>商品图片链接</label>
            <input v-model="formData.image_url" type="text" placeholder="请输入商品图片URL" />
          </div>
          <button type="submit" class="save-btn">保存</button>
        </form>
      </div>
    </div>

    <div v-if="showPriceModal" class="modal-overlay" @click.self="showPriceModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>调整价格 - {{ priceProduct?.name }}</h3>
          <button class="close-btn" @click="showPriceModal = false">×</button>
        </div>
        <form @submit.prevent="handleUpdatePrice" class="modal-form">
          <div class="form-group">
            <label>当前价格</label>
            <input type="text" :value="'¥' + parseFloat(priceProduct?.price || 0).toFixed(2)" disabled />
          </div>
          <div class="form-group">
            <label>新价格</label>
            <input v-model.number="priceForm.newPrice" type="number" step="0.01" required />
          </div>
          <div class="form-group">
            <label>调整原因</label>
            <input v-model="priceForm.reason" type="text" placeholder="请输入调整原因" />
          </div>
          <button type="submit" class="save-btn">确认调整</button>
          <button type="button" class="cancel-btn" @click="showPriceModal = false">取消</button>
        </form>

        <div class="history-section">
          <h4>价格历史</h4>
          <div class="history-list">
            <div v-for="item in priceHistory" :key="item.id" class="history-item">
              <span>从 ¥{{ parseFloat(item.old_price).toFixed(2) }}</span>
              <span>调整为 ¥{{ parseFloat(item.new_price).toFixed(2) }}</span>
              <span>{{ item.changed_by_username }}</span>
              <span>{{ formatTime(item.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showStockModal" class="modal-overlay" @click.self="showStockModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>库存管理 - {{ stockProduct?.name }}</h3>
          <button class="close-btn" @click="showStockModal = false">×</button>
        </div>
        <div class="current-stock">
          <span>当前库存：</span>
          <span class="stock-value">{{ stockProduct?.stock }}</span>
        </div>
        <form @submit.prevent="handleUpdateStock" class="modal-form">
          <div class="form-group">
            <label>操作类型</label>
            <select v-model="stockForm.changeType" required>
              <option value="increase">增加库存</option>
              <option value="decrease">减少库存</option>
              <option value="set">设置库存</option>
            </select>
          </div>
          <div class="form-group">
            <label>数量</label>
            <input v-model.number="stockForm.amount" type="number" required />
          </div>
          <div class="form-group">
            <label>原因</label>
            <input v-model="stockForm.reason" type="text" placeholder="请输入调整原因" />
          </div>
          <button type="submit" class="save-btn">确认调整</button>
          <button type="button" class="cancel-btn" @click="showStockModal = false">取消</button>
        </form>

        <div class="history-section">
          <h4>库存变更历史</h4>
          <div class="history-list">
            <div v-for="item in stockHistory" :key="item.id" class="history-item">
              <span :class="item.change_type === 'increase' ? 'text-success' : item.change_type === 'decrease' ? 'text-danger' : ''">
                {{ item.change_type === 'increase' ? '+' : item.change_type === 'decrease' ? '-' : '' }}{{ Math.abs(item.change_amount) }}
              </span>
              <span>{{ item.change_type === 'set' ? '设置为' : item.change_type === 'increase' ? '增加' : '减少' }}{{ Math.abs(item.change_amount) }}</span>
              <span>{{ item.changed_by_username }}</span>
              <span>{{ formatTime(item.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="cancelDelete">
      <div class="modal-content confirm-modal">
        <div class="modal-header">
          <h3>确认下架商品</h3>
          <button class="close-btn" @click="cancelDelete" aria-label="关闭弹窗">×</button>
        </div>
        <div class="confirm-content">
          <p>您确定要将商品 <strong>{{ productToDelete?.name }}</strong> 下架吗？</p>
          <p class="warning-text">下架后商品将不再对外展示，但数据会被保留。</p>
        </div>
        <div class="modal-actions">
          <button class="cancel-btn" @click="cancelDelete">取消</button>
          <button class="confirm-btn" @click="confirmDeleteProduct">确认下架</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'
import { ElMessage } from 'element-plus'


const tabs = [
  { label: '商品管理', value: 'products' },
  { label: '订单管理', value: 'orders' },
  { label: '销售统计', value: 'stats' },
  { label: '用户行为', value: 'behavior' },
  { label: '行为日志', value: 'logs' }
]

const activeTab = ref('products')
const products = ref([])
const orders = ref([])
const stats = ref({})
const salesTrend = ref([])
const categoryDistribution = ref([])
const inventoryAlerts = ref({ low_stock: [], out_of_stock: [] })
const behaviorStats = ref([])
const topViewed = ref([])
const currentPeriod = ref('month')

const logs = ref([])
const logsTotal = ref(0)
const logsPage = ref(1)
const logsLimit = ref(20)
const logsFilter = ref({
  start_time: '',
  end_time: '',
  username: '',
  category: '',
  behavior_type: ''
})
const purchaseLogs = ref([])
const purchaseLogsTotal = ref(0)
const purchaseLogsPage = ref(1)
const purchaseLogsLimit = ref(20)
const purchaseLogsFilter = ref({
  start_time: '',
  end_time: '',
  username: '',
  category: ''
})
const activeLogsTab = ref('behavior')

const showAddModal = ref(false)
const editingProduct = ref(null)
const formData = ref({
  name: '',
  category: '',
  price: 0,
  stock: 0,
  description: '',
  image_url: ''
})

const showPriceModal = ref(false)
const priceProduct = ref(null)
const priceForm = ref({
  newPrice: 0,
  reason: ''
})
const priceHistory = ref([])

const showStockModal = ref(false)
const stockProduct = ref(null)
const stockForm = ref({
  changeType: 'increase',
  amount: 0,
  reason: ''
})
const stockHistory = ref([])

const showDeleteConfirm = ref(false)
const productToDelete = ref(null)

const confirmDelete = (product) => {
  productToDelete.value = product
  showDeleteConfirm.value = true
}

const cancelDelete = () => {
  showDeleteConfirm.value = false
  productToDelete.value = null
}

const confirmDeleteProduct = async () => {
  if (!productToDelete.value) return
  
  try {
    const response = await api.products.deleteProduct(productToDelete.value.id)
    if (response.success) {
      ElMessage.success('商品下架成功')
      await fetchProducts()
    } else {
      ElMessage.error('下架失败')
    }
  } catch (error) {
    ElMessage.error('下架失败')
  }
  
  showDeleteConfirm.value = false
  productToDelete.value = null
}

const getStatusText = (status) => {
  const map = {
    pending: '待支付',
    payed: '已支付',
    shipped: '已发货',
    completed: '已完成',
    canceled: '已取消'
  }
  return map[status] || status
}

const getBehaviorText = (type) => {
  const map = {
    view: '浏览',
    click: '点击',
    add_cart: '加购',
    purchase: '购买',
    like: '收藏'
  }
  return map[type] || type
}

const formatTime = (timeStr) => {
  return new Date(timeStr).toLocaleString('zh-CN')
}

const fetchProducts = async () => {
  const response = await api.products.getProducts({ limit: 100 })
  if (response.success) {
    products.value = response.data.list
  }
}

const fetchOrders = async () => {
  const response = await api.orders.getOrders({ limit: 100 })
  if (response.success) {
    orders.value = response.data.list
  }
}

const fetchStats = async () => {
  try {
    const response = await api.analysis.getOverview()
    if (response.success) {
      stats.value = response.data.overview
      salesTrend.value = response.data.sales_trend || []
      categoryDistribution.value = response.data.category_distribution || []
    }
    
    await fetchSalesTrend('month')
    await fetchInventoryAlert()
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

const fetchSalesTrend = async (period) => {
  currentPeriod.value = period
  try {
    const response = await api.analysis.getSalesTrend({ period })
    if (response.success) {
      salesTrend.value = response.data || []
    }
  } catch (error) {
    console.error('获取销售趋势失败:', error)
  }
}

const fetchInventoryAlert = async () => {
  try {
    const response = await api.analysis.getInventoryAlert()
    if (response.success) {
      inventoryAlerts.value = response.data
    }
  } catch (error) {
    console.error('获取库存预警失败:', error)
  }
}

const fetchBehaviorData = async () => {
  try {
    const response = await api.analysis.getUserBehavior()
    if (response.success) {
      behaviorStats.value = response.data.behavior_stats || []
      topViewed.value = response.data.top_viewed || []
    }
  } catch (error) {
    console.error('获取用户行为数据失败:', error)
  }
}

const fetchLogs = async () => {
  try {
    const params = {
      page: logsPage.value,
      limit: logsLimit.value,
      ...logsFilter.value
    }
    const response = await api.behavior.queryLogs(params)
    if (response.success) {
      logs.value = response.data.list
      logsTotal.value = response.data.total
    }
  } catch (error) {
    console.error('获取行为日志失败:', error)
  }
}

const fetchPurchaseLogs = async () => {
  try {
    const params = {
      page: purchaseLogsPage.value,
      limit: purchaseLogsLimit.value,
      ...purchaseLogsFilter.value
    }
    const response = await api.behavior.queryPurchaseLogs(params)
    if (response.success) {
      purchaseLogs.value = response.data.list
      purchaseLogsTotal.value = response.data.total
    }
  } catch (error) {
    console.error('获取购买日志失败:', error)
  }
}

const exportLogs = async () => {
  try {
    const params = {
      export_type: 'csv',
      ...logsFilter.value
    }
    const response = await api.behavior.exportLogs(params)
    downloadFile(response, 'behavior_logs.csv')
  } catch (error) {
    console.error('导出日志失败:', error)
  }
}

const exportPurchaseLogs = async () => {
  try {
    const params = {
      export_type: 'csv',
      ...purchaseLogsFilter.value
    }
    const response = await api.behavior.exportPurchaseLogs(params)
    downloadFile(response, 'purchase_logs.csv')
  } catch (error) {
    console.error('导出购买日志失败:', error)
  }
}

const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

const addProduct = async () => {
  const response = await api.products.createProduct(formData.value)
  if (response.success) {
    ElMessage.success('商品添加成功')
    await fetchProducts()
    closeModal()
  } else {
    ElMessage.error('添加失败')
  }
}

const updateProduct = async () => {
  const response = await api.products.updateProduct(editingProduct.value.id, formData.value)
  if (response.success) {
    ElMessage.success('商品更新成功')
    await fetchProducts()
    closeModal()
  } else {
    ElMessage.error('更新失败')
  }
}

const editProduct = (product) => {
  editingProduct.value = product
  formData.value = {
    name: product.name,
    category: product.category,
    price: parseFloat(product.price),
    stock: product.stock,
    description: product.description || '',
    image_url: product.image_url || ''
  }
  showAddModal.value = true
}

const openPriceModal = async (product) => {
  priceProduct.value = product
  priceForm.value = { newPrice: parseFloat(product.price), reason: '' }
  showPriceModal.value = true
  
  try {
    const response = await api.products.getPriceHistory(product.id)
    if (response.success) {
      priceHistory.value = response.data.list || []
    }
  } catch (error) {
    console.error('获取价格历史失败:', error)
  }
}

const handleUpdatePrice = async () => {
  try {
    const response = await api.products.updatePrice(priceProduct.value.id, {
      price: priceForm.value.newPrice,
      reason: priceForm.value.reason
    })
    if (response.success) {
      ElMessage.success('价格调整成功')
      await fetchProducts()
      showPriceModal.value = false
    } else {
      ElMessage.error('价格调整失败')
    }
  } catch (error) {
    console.error('价格调整失败:', error)
    ElMessage.error('价格调整失败')
  }
}

const openStockModal = async (product) => {
  stockProduct.value = product
  stockForm.value = { changeType: 'increase', amount: 0, reason: '' }
  showStockModal.value = true
  
  try {
    const response = await api.products.getStockHistory(product.id)
    if (response.success) {
      stockHistory.value = response.data.list || []
    }
  } catch (error) {
    console.error('获取库存历史失败:', error)
  }
}

const handleUpdateStock = async () => {
  try {
    const response = await api.products.updateStock(stockProduct.value.id, {
      change_amount: stockForm.value.amount,
      change_type: stockForm.value.changeType,
      reason: stockForm.value.reason
    })
    if (response.success) {
      ElMessage.success('库存调整成功')
      await fetchProducts()
      showStockModal.value = false
    } else {
      ElMessage.error('库存调整失败')
    }
  } catch (error) {
    console.error('库存调整失败:', error)
    ElMessage.error('库存调整失败')
  }
}

const updateOrderStatus = async (orderId, status) => {
  const response = await api.orders.updateOrder(orderId, { status })
  if (response.success) {
    ElMessage.success('状态更新成功')
    await fetchOrders()
  } else {
    ElMessage.error('更新失败')
  }
}

const handleSaveProduct = () => {
  if (editingProduct.value) {
    updateProduct()
  } else {
    addProduct()
  }
}

const closeModal = () => {
  showAddModal.value = false
  editingProduct.value = null
  formData.value = {
    name: '',
    category: '',
    price: 0,
    stock: 0,
    description: '',
    image_url: ''
  }
}

onMounted(async () => {
  await Promise.all([
    fetchProducts(),
    fetchOrders(),
    fetchStats(),
    fetchBehaviorData()
  ])
})
</script>

<style scoped>
.sales-container {
  padding: 20px 0;
}

.sales-container h1 {
  font-size: 28px;
  margin-bottom: 20px;
}

.tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.tab-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  background: #f0f0f0;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-btn.active {
  background: #667eea;
  color: white;
}

.tab-content {
  background: white;
  border-radius: 8px;
  padding: 20px;
}

.add-product {
  margin-bottom: 20px;
}

.add-btn {
  background: #667eea;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}

th {
  background: #f8f9fa;
  font-weight: 600;
}

.low {
  color: #e74c3c;
}

.edit-btn, .price-btn, .stock-btn {
  background: #667eea;
  color: white;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 8px;
}

.stock-btn {
  background: #27ae60;
}

.delete-btn {
  background: #e74c3c;
  color: white;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.product-thumb {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 4px;
}

.status-btn {
  background: #27ae60;
  color: white;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  font-size: 40px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
}

.stat-label {
  font-size: 14px;
  opacity: 0.8;
}

.stats-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.stats-section h3 {
  margin-bottom: 15px;
  font-size: 18px;
}

.period-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.period-btn {
  padding: 8px 16px;
  border: 1px solid #667eea;
  background: white;
  color: #667eea;
  border-radius: 6px;
  cursor: pointer;
}

.period-btn.active {
  background: #667eea;
  color: white;
}

.trend-chart, .category-dist {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.trend-item, .category-item {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alert-item {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  border-radius: 6px;
}

.alert-item.low {
  background: #fff3cd;
  color: #856404;
}

.alert-item.critical {
  background: #f8d7da;
  color: #721c24;
}

.stock-count {
  font-weight: bold;
}

.behavior-stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.behavior-item {
  display: flex;
  justify-content: space-between;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.behavior-type {
  font-weight: 600;
}

.top-viewed {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.viewed-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.viewed-item .rank {
  width: 30px;
  height: 30px;
  background: #667eea;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.viewed-item .name {
  flex: 1;
}

.viewed-item .category {
  color: #666;
}

.viewed-item .count {
  font-weight: bold;
  color: #667eea;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 5px;
  font-weight: 600;
}

.modal-form input,
.modal-form select,
.modal-form textarea {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.save-btn {
  background: #667eea;
  color: white;
  padding: 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.cancel-btn {
  background: #f0f0f0;
  color: #666;
  padding: 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.current-stock {
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 20px;
}

.stock-value {
  font-size: 24px;
  font-weight: bold;
  color: #667eea;
}

.history-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.history-section h4 {
  margin-bottom: 10px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 14px;
}

.text-success {
  color: #27ae60;
}

.text-danger {
  color: #e74c3c;
}

.no-alert {
  padding: 20px;
  text-align: center;
  color: #666;
}

.logs-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.logs-tab-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  background: #f0f0f0;
  cursor: pointer;
  transition: all 0.3s;
}

.logs-tab-btn.active {
  background: #667eea;
  color: white;
}

.export-btn {
  margin-left: auto;
  background: #27ae60;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.logs-content {
  margin-top: 20px;
}

.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filters input,
.filters select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.filter-btn {
  background: #667eea;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
}

.logs-table th,
.logs-table td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
}

.logs-table th {
  background: #f8f9fa;
  font-weight: 600;
}
</style>
