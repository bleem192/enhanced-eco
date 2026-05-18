<template>
  <div class="cart-container">
    <h1>购物车</h1>
    
    <div v-if="cartStore.items.length === 0" class="empty-cart">
      <span class="empty-icon">🛒</span>
      <p>购物车是空的</p>
      <router-link to="/products" class="empty-btn">去购物</router-link>
    </div>

    <div v-else class="cart-content">
      <div class="cart-items">
        <div 
          v-for="item in cartStore.items" 
          :key="item.id" 
          class="cart-item"
        >
          <img :src="item.image_url || 'https://via.placeholder.com/100'" :alt="item.name" class="item-image" width="100" height="100" />
          <div class="item-info">
            <h3 class="item-name">{{ item.name }}</h3>
            <p class="item-category">{{ item.category }}</p>
            <p class="item-price">¥{{ parseFloat(item.price).toFixed(2) }}</p>
          </div>
          <div class="item-quantity">
            <button class="qty-btn" @click="updateQuantity(item.id, item.quantity - 1)">-</button>
            <span>{{ item.quantity }}</span>
            <button class="qty-btn" @click="updateQuantity(item.id, item.quantity + 1)">+</button>
          </div>
          <div class="item-total">
            ¥{{ (parseFloat(item.price) * item.quantity).toFixed(2) }}
          </div>
          <button class="remove-btn" @click="removeItem(item.id)">×</button>
        </div>
      </div>

      <div class="cart-summary">
        <div class="summary-header">订单摘要</div>
        <div class="summary-row">
          <span>商品数量:</span>
          <span>{{ cartStore.totalItems }}</span>
        </div>
        <div class="summary-row">
          <span>运费:</span>
          <span>¥0.00</span>
        </div>
        <div class="summary-row total">
          <span>总计:</span>
          <span>¥{{ parseFloat(cartStore.totalPrice || 0).toFixed(2) }}</span>
        </div>
        <div class="shipping-info">
          <input 
            v-model="shippingAddress" 
            type="text" 
            placeholder="请输入收货地址" 
            class="address-input"
          />
          <select v-model="paymentMethod" class="payment-select">
            <option value="wechat">微信支付</option>
            <option value="alipay">支付宝</option>
            <option value="bank">银行转账</option>
          </select>
        </div>
        <button class="checkout-btn" @click="handleCheckout">
          结算 (¥{{ parseFloat(cartStore.totalPrice || 0).toFixed(2) }})
        </button>
        <button class="clear-btn" @click="handleClear">清空购物车</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'
import api from '@/api'
import { ElMessage } from 'element-plus'

const router = useRouter()
const cartStore = useCartStore()
const authStore = useAuthStore()
const shippingAddress = ref('')
const paymentMethod = ref('wechat')

const updateQuantity = async (cartId, quantity) => {
  if (quantity < 1) return
  await cartStore.updateCartItem(cartId, quantity)
}

const removeItem = async (cartId) => {
  await cartStore.removeFromCart(cartId)
}

const handleClear = async () => {
  await cartStore.clearCart()
  ElMessage.info('购物车已清空')
}

const handleCheckout = async () => {
  if (!shippingAddress.value.trim()) {
    ElMessage.warning('请输入收货地址')
    return
  }

  const items = cartStore.items.map(item => ({
    product_id: item.product_id,
    product_name: item.name,
    quantity: item.quantity,
    price: parseFloat(item.price)
  }))

  try {
    const response = await api.orders.createOrder({
      items,
      shipping_address: shippingAddress.value,
      payment_method: paymentMethod.value
    })

    if (response.success) {
      ElMessage.success('订单创建成功')
      
      await api.behavior.recordPurchase({
        user_id: authStore.user?.id,
        username: authStore.user?.username,
        order_id: response.data.order_id,
        items: items.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          category: '',
          price: item.price,
          quantity: item.quantity
        })),
        total_amount: response.data.total_amount
      })
      
      cartStore.items = []
      shippingAddress.value = ''
      router.push('/orders')
    } else {
      ElMessage.error('订单创建失败')
    }
  } catch (error) {
    console.error('创建订单失败:', error)
    ElMessage.error('订单创建失败')
  }
}

onMounted(async () => {
  await cartStore.fetchCart()
})
</script>

<style scoped>
.cart-container {
  padding: 20px 0;
}

.cart-container h1 {
  font-size: 28px;
  margin-bottom: 20px;
}

.empty-cart {
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

.empty-cart p {
  font-size: 18px;
  color: #666;
  margin-bottom: 20px;
}

.empty-btn {
  background: #667eea;
  color: white;
  padding: 12px 32px;
  border-radius: 8px;
  text-decoration: none;
}

.cart-content {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 30px;
}

.cart-items {
  background: white;
  border-radius: 12px;
  padding: 20px;
}

.cart-item {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 0;
  border-bottom: 1px solid #f0f0f0;
}

.cart-item:last-child {
  border-bottom: none;
}

.item-image {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
}

.item-info {
  flex: 1;
}

.item-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.item-category {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.item-price {
  font-size: 18px;
  font-weight: bold;
  color: #e74c3c;
}

.item-quantity {
  display: flex;
  align-items: center;
  gap: 12px;
}

.qty-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  font-size: 18px;
  cursor: pointer;
}

.item-total {
  font-size: 18px;
  font-weight: bold;
  min-width: 100px;
  text-align: right;
}

.remove-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
}

.cart-summary {
  background: white;
  border-radius: 12px;
  padding: 20px;
  height: fit-content;
}

.summary-header {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.summary-row.total {
  font-size: 20px;
  font-weight: bold;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.shipping-info {
  margin: 20px 0;
}

.address-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  margin-bottom: 12px;
}

.payment-select {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.checkout-btn {
  width: 100%;
  background: #e74c3c;
  color: white;
  padding: 14px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  margin-bottom: 12px;
}

.clear-btn {
  width: 100%;
  background: #f0f0f0;
  color: #666;
  padding: 12px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
</style>
