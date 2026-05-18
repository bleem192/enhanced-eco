<template>
  <div class="admin-container">
    <h1>系统管理</h1>
    
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

    <div v-if="activeTab === 'users'" class="tab-content">
      <div class="filter-bar">
        <select v-model="userFilter.role" @change="fetchUsers">
          <option value="">全部角色</option>
          <option value="customer">客户</option>
          <option value="sales">销售</option>
          <option value="admin">管理员</option>
        </select>
        <button class="add-btn" @click="showUserModal = true">+ 添加用户</button>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>用户名</th>
              <th>邮箱</th>
              <th>角色</th>
              <th>状态</th>
              <th>注册时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>{{ user.id }}</td>
              <td>{{ user.username }}</td>
              <td>{{ user.email }}</td>
              <td>{{ getRoleText(user.role) }}</td>
              <td>{{ user.status === 'active' ? '正常' : '禁用' }}</td>
              <td>{{ formatTime(user.created_at) }}</td>
              <td>
                <button class="edit-btn" @click="editUser(user)" aria-label="编辑用户 {{ user.username }}">编辑</button>
                <button class="reset-btn" @click="openResetModal(user)" aria-label="重置用户 {{ user.username }} 密码">重置密码</button>
                <button class="log-btn" @click="viewUserLogs(user.id)" aria-label="查看用户 {{ user.username }} 日志">日志</button>
                <button class="delete-btn" @click="confirmDeleteUser(user)" aria-label="删除用户 {{ user.username }}">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="activeTab === 'sales'" class="tab-content">
      <div class="stats-cards">
        <div class="stat-card">
          <span class="stat-icon">💰</span>
          <div class="stat-info">
            <p class="stat-value">¥{{ parseFloat(salesStats.overview?.total_revenue || 0).toFixed(2) }}</p>
            <p class="stat-label">总销售额</p>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">📦</span>
          <div class="stat-info">
            <p class="stat-value">{{ salesStats.overview?.total_orders || 0 }}</p>
            <p class="stat-label">订单总数</p>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">👥</span>
          <div class="stat-info">
            <p class="stat-value">{{ salesStats.overview?.unique_customers || 0 }}</p>
            <p class="stat-label">客户数</p>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">📊</span>
          <div class="stat-info">
            <p class="stat-value">¥{{ parseFloat(salesStats.overview?.avg_order_value || 0).toFixed(2) }}</p>
            <p class="stat-label">平均订单额</p>
          </div>
        </div>
      </div>

      <div class="stats-section">
        <h3>销售业绩排行</h3>
        <table>
          <thead>
            <tr>
              <th>销售员</th>
              <th>订单数</th>
              <th>客户数</th>
              <th>总销售额</th>
              <th>平均订单额</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sale in salesPerformance" :key="sale.id">
              <td>{{ sale.username }}</td>
              <td>{{ sale.order_count }}</td>
              <td>{{ sale.customer_count }}</td>
              <td>¥{{ parseFloat(sale.total_revenue).toFixed(2) }}</td>
              <td>¥{{ parseFloat(sale.avg_order_value).toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="stats-section">
        <h3>库存统计</h3>
        <div class="inventory-stats">
          <div class="inv-item normal">
            <span>正常库存</span>
            <span class="count">{{ inventoryStats.normal_stock || 0 }}</span>
          </div>
          <div class="inv-item low">
            <span>低库存</span>
            <span class="count">{{ inventoryStats.low_stock || 0 }}</span>
          </div>
          <div class="inv-item out">
            <span>缺货</span>
            <span class="count">{{ inventoryStats.out_of_stock || 0 }}</span>
          </div>
          <div class="inv-item total">
            <span>总库存</span>
            <span class="count">{{ inventoryStats.total_stock || 0 }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'logs'" class="tab-content">
      <div class="filter-bar">
        <select v-model="logFilter.module" @change="fetchLogs">
          <option value="">全部模块</option>
          <option value="auth">认证</option>
          <option value="products">商品</option>
          <option value="orders">订单</option>
          <option value="admin">管理</option>
          <option value="analysis">分析</option>
        </select>
        <button class="export-btn" @click="exportLogs">导出日志</button>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>用户名</th>
              <th>操作</th>
              <th>模块</th>
              <th>IP地址</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id">
              <td>{{ log.id }}</td>
              <td>{{ log.username }}</td>
              <td>{{ log.operation }}</td>
              <td>{{ log.module }}</td>
              <td>{{ log.ip_address }}</td>
              <td>{{ formatTime(log.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="activeTab === 'reports'" class="tab-content">
      <div class="report-selector">
        <h3>报表导出</h3>
        <div class="report-types">
          <button class="report-btn" @click="exportReport('sales')">
            <span class="icon">📊</span>
            <span>销售报表</span>
          </button>
          <button class="report-btn" @click="exportReport('products')">
            <span class="icon">📦</span>
            <span>商品报表</span>
          </button>
          <button class="report-btn" @click="exportReport('customers')">
            <span class="icon">👥</span>
            <span>客户报表</span>
          </button>
        </div>
      </div>

      <div class="stats-section">
        <h3>订单状态分布</h3>
        <div class="order-status-dist">
          <div v-for="stat in orderStatusDist" :key="stat.status" class="status-item">
            <span class="status-name">{{ getStatusText(stat.status) }}</span>
            <span class="status-count">{{ stat.count }}</span>
            <span class="status-amount">¥{{ parseFloat(stat.revenue).toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <div class="stats-section">
        <h3>类别销售分布</h3>
        <div class="category-dist">
          <div v-for="cat in categoryDistribution" :key="cat.category" class="category-item">
            <span class="category-name">{{ cat.category }}</span>
            <span class="category-count">{{ cat.count }}单</span>
            <span class="category-amount">¥{{ parseFloat(cat.revenue).toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showUserModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingUser ? '编辑用户' : '添加用户' }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <form @submit.prevent="handleSaveUser" class="modal-form">
          <div class="form-group">
            <label>用户名</label>
            <input v-model="userForm.username" type="text" required :disabled="editingUser" />
          </div>
          <div class="form-group">
            <label>邮箱</label>
            <input v-model="userForm.email" type="email" required />
          </div>
          <div class="form-group" v-if="!editingUser">
            <label>密码</label>
            <input v-model="userForm.password" type="password" required />
          </div>
          <div class="form-group">
            <label>角色</label>
            <select v-model="userForm.role" required>
              <option value="customer">客户</option>
              <option value="sales">销售</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          <div class="form-group">
            <label>状态</label>
            <select v-model="userForm.status" required>
              <option value="active">正常</option>
              <option value="inactive">禁用</option>
            </select>
          </div>
          <button type="submit" class="save-btn">保存</button>
        </form>
      </div>
    </div>

    <div v-if="showResetModal" class="modal-overlay" @click.self="showResetModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>重置密码 - {{ resetUser?.username }}</h3>
          <button class="close-btn" @click="showResetModal = false">×</button>
        </div>
        <form @submit.prevent="handleResetPassword" class="modal-form">
          <div class="form-group">
            <label>新密码</label>
            <input v-model="resetForm.password" type="password" required placeholder="请输入新密码" />
          </div>
          <button type="submit" class="save-btn">确认重置</button>
          <button type="button" class="cancel-btn" @click="showResetModal = false">取消</button>
        </form>
      </div>
    </div>

    <div v-if="showLogModal" class="modal-overlay" @click.self="showLogModal = false">
      <div class="modal-content large">
        <div class="modal-header">
          <h3>用户操作日志</h3>
          <button class="close-btn" @click="showLogModal = false">×</button>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>操作</th>
                <th>模块</th>
                <th>IP地址</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in userLogs" :key="log.id">
                <td>{{ log.id }}</td>
                <td>{{ log.operation }}</td>
                <td>{{ log.module }}</td>
                <td>{{ log.ip_address }}</td>
                <td>{{ formatTime(log.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="cancelDeleteUser">
      <div class="modal-content confirm-modal">
        <div class="modal-header">
          <h3>确认删除用户</h3>
          <button class="close-btn" @click="cancelDeleteUser" aria-label="关闭弹窗">×</button>
        </div>
        <div class="confirm-content">
          <p>您确定要删除用户 <strong>{{ userToDelete?.username }}</strong> 吗？</p>
          <p class="warning-text">删除后将无法恢复，请谨慎操作。</p>
        </div>
        <div class="modal-actions">
          <button class="cancel-btn" @click="cancelDeleteUser">取消</button>
          <button class="confirm-btn" @click="confirmDelete">确认删除</button>
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
  { label: '用户管理', value: 'users' },
  { label: '销售业绩', value: 'sales' },
  { label: '操作日志', value: 'logs' },
  { label: '统计报表', value: 'reports' }
]

const activeTab = ref('users')
const users = ref([])
const salesPerformance = ref([])
const salesStats = ref({ overview: {} })
const inventoryStats = ref({})
const logs = ref([])
const userLogs = ref([])
const categoryDistribution = ref([])
const orderStatusDist = ref([])

const userFilter = ref({ role: '' })
const logFilter = ref({ module: '' })

const showUserModal = ref(false)
const editingUser = ref(null)
const userForm = ref({
  username: '',
  email: '',
  password: '',
  role: 'customer',
  status: 'active'
})

const showResetModal = ref(false)
const resetUser = ref(null)
const resetForm = ref({ password: '' })

const showLogModal = ref(false)
const logUserId = ref(null)

const showDeleteConfirm = ref(false)
const userToDelete = ref(null)

const confirmDeleteUser = (user) => {
  userToDelete.value = user
  showDeleteConfirm.value = true
}

const cancelDeleteUser = () => {
  showDeleteConfirm.value = false
  userToDelete.value = null
}

const confirmDelete = async () => {
  if (!userToDelete.value) return
  
  try {
    const response = await api.admin.deleteUser(userToDelete.value.id)
    if (response.success) {
      ElMessage.success('用户删除成功')
      await fetchUsers()
    } else {
      ElMessage.error('删除失败')
    }
  } catch (error) {
    console.error('删除用户失败:', error)
    ElMessage.error('删除失败')
  }
  
  showDeleteConfirm.value = false
  userToDelete.value = null
}

const getRoleText = (role) => {
  const map = { customer: '客户', sales: '销售', admin: '管理员' }
  return map[role] || role
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

const formatTime = (timeStr) => {
  return new Date(timeStr).toLocaleString('zh-CN')
}

const fetchUsers = async () => {
  try {
    const params = {}
    if (userFilter.value.role) params.role = userFilter.value.role
    const response = await api.admin.getUsers(params)
    if (response.success) {
      users.value = response.data.list
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
  }
}

const fetchSalesPerformance = async () => {
  try {
    const response = await api.admin.getSalesPerformance()
    if (response.success) {
      salesPerformance.value = response.data
    }
  } catch (error) {
    console.error('获取销售业绩失败:', error)
  }
}

const fetchSalesStats = async () => {
  try {
    const response = await api.admin.getSalesStats()
    if (response.success) {
      salesStats.value = response.data
      categoryDistribution.value = response.data.category_distribution || []
      orderStatusDist.value = response.data.order_status_distribution || []
      inventoryStats.value = response.data.inventory_stats || {}
    }
  } catch (error) {
    console.error('获取销售统计失败:', error)
  }
}

const fetchLogs = async () => {
  try {
    const params = {}
    if (logFilter.value.module) params.module = logFilter.value.module
    const response = await api.admin.getLogs(params)
    if (response.success) {
      logs.value = response.data.list
    }
  } catch (error) {
    console.error('获取日志失败:', error)
  }
}

const createUser = async () => {
  try {
    const response = await api.admin.createUser(userForm.value)
    if (response.success) {
      ElMessage.success('用户创建成功')
      await fetchUsers()
      closeModal()
    } else {
      ElMessage.error('创建失败')
    }
  } catch (error) {
    console.error('创建用户失败:', error)
    ElMessage.error('创建失败')
  }
}

const updateUser = async () => {
  try {
    const response = await api.admin.updateUser(editingUser.value.id, {
      username: userForm.value.username,
      email: userForm.value.email,
      role: userForm.value.role,
      status: userForm.value.status
    })
    if (response.success) {
      ElMessage.success('用户更新成功')
      await fetchUsers()
      closeModal()
    } else {
      ElMessage.error('更新失败')
    }
  } catch (error) {
    console.error('更新用户失败:', error)
    ElMessage.error('更新失败')
  }
}

const editUser = (user) => {
  editingUser.value = user
  userForm.value = {
    username: user.username,
    email: user.email,
    password: '',
    role: user.role,
    status: user.status
  }
  showUserModal.value = true
}

const deleteUser = async (id) => {
  if (!confirm('确定要删除这个用户吗？')) return
  try {
    const response = await api.admin.deleteUser(id)
    if (response.success) {
      ElMessage.success('删除成功')
      await fetchUsers()
    } else {
      ElMessage.error('删除失败')
    }
  } catch (error) {
    console.error('删除用户失败:', error)
    ElMessage.error('删除失败')
  }
}

const openResetModal = (user) => {
  resetUser.value = user
  resetForm.value = { password: '' }
  showResetModal.value = true
}

const handleResetPassword = async () => {
  try {
    const response = await api.admin.resetPassword(resetUser.value.id, {
      newPassword: resetForm.value.password
    })
    if (response.success) {
      ElMessage.success('密码重置成功')
      showResetModal.value = false
    } else {
      ElMessage.error('重置失败')
    }
  } catch (error) {
    console.error('重置密码失败:', error)
    ElMessage.error('重置失败')
  }
}

const viewUserLogs = async (userId) => {
  logUserId.value = userId
  try {
    const response = await api.admin.getUserLoginLogs(userId)
    if (response.success) {
      userLogs.value = response.data.list
      showLogModal.value = true
    }
  } catch (error) {
    console.error('获取用户日志失败:', error)
    ElMessage.error('获取日志失败')
  }
}

const handleSaveUser = () => {
  if (editingUser.value) {
    updateUser()
  } else {
    createUser()
  }
}

const closeModal = () => {
  showUserModal.value = false
  editingUser.value = null
  userForm.value = {
    username: '',
    email: '',
    password: '',
    role: 'customer',
    status: 'active'
  }
}

const exportReport = async (type) => {
  try {
    const response = await api.admin.getReports({ type })
    if (response.success) {
      ElMessage.success(`${type} 报表已生成`)
      console.log('报表数据:', response.data)
    }
  } catch (error) {
    console.error('导出报表失败:', error)
    ElMessage.error('导出失败')
  }
}

const exportLogs = async () => {
  ElMessage.info('日志导出功能开发中')
}

onMounted(async () => {
  await Promise.all([
    fetchUsers(),
    fetchSalesPerformance(),
    fetchSalesStats(),
    fetchLogs()
  ])
})
</script>

<style scoped>
.admin-container {
  padding: 20px 0;
}

.admin-container h1 {
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

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filter-bar select {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.add-btn, .export-btn {
  background: #667eea;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.table-container {
  overflow-x: auto;
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

.edit-btn, .reset-btn, .log-btn {
  background: #667eea;
  color: white;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 8px;
}

.delete-btn {
  background: #e74c3c;
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

.inventory-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
}

.inv-item {
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}

.inv-item.normal {
  background: #d4edda;
  color: #155724;
}

.inv-item.low {
  background: #fff3cd;
  color: #856404;
}

.inv-item.out {
  background: #f8d7da;
  color: #721c24;
}

.inv-item.total {
  background: #e2e3e5;
  color: #383d41;
}

.inv-item .count {
  display: block;
  font-size: 24px;
  font-weight: bold;
  margin-top: 8px;
}

.report-selector {
  margin-bottom: 30px;
}

.report-types {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.report-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px;
  background: #f8f9fa;
  border: 2px solid #ddd;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.report-btn:hover {
  border-color: #667eea;
  background: #e9ecef;
}

.report-btn .icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.order-status-dist, .category-dist {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.status-item, .category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
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
  max-width: 500px;
}

.modal-content.large {
  max-width: 800px;
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
.modal-form select {
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
</style>
