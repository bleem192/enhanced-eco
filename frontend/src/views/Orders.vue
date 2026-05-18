<template>
  <div class="orders-container">
    <h1>我的订单</h1>
    
    <div v-if="orders.length === 0" class="empty-orders">
      <span class="empty-icon">📦</span>
      <p>暂无订单</p>
      <router-link to="/products" class="empty-btn">去购物</router-link>
    </div>

    <div v-else class="orders-list">
      <div 
        v-for="order in orders" 
        :key="order.id" 
        class="order-card"
      >
        <div class="order-header">
          <span class="order-id">订单号: {{ order.id }}</span>
          <span class="order-status" :class="getStatusClass(order.status)">
            {{ getStatusText(order.status) }}
          </span>
        </div>
        
        <div class="order-items">
          <div 
            v-for="item in order.items" 
            :key="item.id" 
            class="order-item"
          >
            <span class="item-name">{{ item.product_name }}</span>
            <span class="item-quantity">×{{ item.quantity }}</span>
            <span class="item-price">¥{{ parseFloat(item.price).toFixed(2) }}</span>
          </div>
        </div>
        
        <div class="order-footer">
          <span class="order-total">总计: ¥{{ parseFloat(order.total_amount).toFixed(2) }}</span>
          <span class="order-time">{{ formatTime(order.created_at) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const orders = ref([])

const getStatusText = (status) => {
  const statusMap = {
    pending: '待支付',
    payed: '已支付',
    shipped: '已发货',
    completed: '已完成',
    canceled: '已取消'
  }
  return statusMap[status] || status
}

const getStatusClass = (status) => {
  const classMap = {
    pending: 'pending',
    payed: 'payed',
    shipped: 'shipped',
    completed: 'completed',
    canceled: 'canceled'
  }
  return classMap[status] || ''
}

const formatTime = (timeStr) => {
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN')
}

const fetchOrders = async () => {
  try {
    const response = await api.orders.getOrders()
    if (response.success) {
      orders.value = response.data.list
    }
  } catch (error) {
    console.error('获取订单失败:', error)
  }
}

onMounted(async () => {
  await fetchOrders()
})
</script>

<style scoped>
.orders-container {
  padding: 20px 0;
}

.orders-container h1 {
  font-size: 28px;
  margin-bottom: 20px;
}

.empty-orders {
  text-align: center;
  padding: 60px 20px;
  background: #f8f9fa;
  border-radius: 12px;
}

.empty-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 16px;
}

.empty-orders p {
  color: #666;
  margin-bottom: 20px;
}

.empty-btn {
  background: #667eea;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  display: inline-block;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.order-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.order-id {
  font-size: 14px;
  color: #666;
}

.order-status {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
}

.order-status.pending {
  background: #fff3cd;
  color: #856404;
}

.order-status.payed {
  background: #d4edda;
  color: #155724;
}

.order-status.shipped {
  background: #d1ecf1;
  color: #0c5460;
}

.order-status.completed {
  background: #e7f3ff;
  color: #0069d9;
}

.order-status.canceled {
  background: #f8d7da;
  color: #721c24;
}

.order-items {
  margin-bottom: 16px;
}

.order-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}

.item-name {
  flex: 1;
}

.item-quantity {
  color: #666;
  margin: 0 16px;
}

.item-price {
  font-weight: bold;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.order-total {
  font-size: 18px;
  font-weight: bold;
  color: #e74c3c;
}

.order-time {
  font-size: 12px;
  color: #999;
}
</style>