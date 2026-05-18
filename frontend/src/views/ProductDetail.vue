<template>
  <div class="product-detail-container" v-if="product">
    <div class="product-header">
      <button class="back-btn" @click="goBack">← 返回</button>
    </div>
    
    <div class="product-content">
      <div class="product-image-wrapper">
        <img :src="product.image_url || 'https://via.placeholder.com/400'" :alt="product.name" class="product-image" width="400" height="400" />
      </div>
      
      <div class="product-info">
        <h1 class="product-name">{{ product.name }}</h1>
        <p class="product-category">{{ product.category }}</p>
        <p class="product-price">¥{{ parseFloat(product.price).toFixed(2) }}</p>
        <p class="product-stock" :class="{ low: product.stock < 10 }">
          库存: {{ product.stock }} 件
        </p>
        <p class="product-description">{{ product.description }}</p>
        
        <div class="quantity-section">
          <span>数量:</span>
          <button class="qty-btn" @click="quantity = Math.max(1, quantity - 1)">-</button>
          <span class="qty-value">{{ quantity }}</span>
          <button class="qty-btn" @click="quantity = Math.min(product.stock, quantity + 1)">+</button>
        </div>
        
        <div class="action-buttons">
          <button 
            class="add-cart-btn" 
            @click="handleAddToCart"
            :disabled="product.stock === 0"
          >
            加入购物车
          </button>
          <button 
            class="buy-now-btn" 
            @click="handleBuyNow"
            :disabled="product.stock === 0"
          >
            立即购买
          </button>
        </div>
      </div>
    </div>

    <div v-if="relatedProducts.length > 0" class="related-section">
      <h2>相关商品</h2>
      <div class="related-grid">
        <div 
          v-for="item in relatedProducts" 
          :key="item.id" 
          class="related-card"
          @click="goToProduct(item.id)"
        >
          <img :src="item.image_url || 'https://via.placeholder.com/150'" :alt="item.name" class="related-image" width="150" height="150" />
          <p class="related-name">{{ item.name }}</p>
          <p class="related-price">¥{{ parseFloat(item.price).toFixed(2) }}</p>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="loading-state">
    <span class="loading-icon">⏳</span>
    <p>加载中...</p>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import api from '@/api'
import { ElMessage } from 'element-plus'
import { trackPageView, trackPageLeave } from '@/utils/behaviorTracker'


const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const cartStore = useCartStore()

const product = ref(null)
const quantity = ref(1)
const relatedProducts = ref([])

const goBack = () => {
  router.back()
}

const goToProduct = (id) => {
  router.push(`/product/${id}`)
}

const fetchProduct = async () => {
  try {
    product.value = null
    quantity.value = 1
    const response = await api.products.getProduct(route.params.id)
    if (response.success) {
      product.value = response.data
      trackPageView(window.location.pathname, {
        id: product.value.id,
        name: product.value.name,
        category: product.value.category
      })
      await fetchRelatedProducts()
    }
  } catch (error) {
    console.error('获取商品详情失败:', error)
  }
}

const fetchRelatedProducts = async () => {
  if (!product.value) return
  try {
    const response = await api.products.getProducts({ 
      category: product.value.category, 
      limit: 4 
    })
    if (response.success) {
      relatedProducts.value = response.data.list.filter(p => p.id !== product.value.id)
    }
  } catch (error) {
    console.error('获取相关商品失败:', error)
  }
}

const handleAddToCart = async () => {
  if (!authStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  const success = await cartStore.addToCart(product.value.id, quantity.value)
  if (success) {
    ElMessage.success('已添加到购物车')
    quantity.value = 1
  } else {
    ElMessage.error('添加失败')
  }
}

const handleBuyNow = async () => {
  if (!authStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  await cartStore.addToCart(product.value.id, quantity.value)
  router.push('/cart')
}

watch(() => route.params.id, async (newId) => {
  if (newId) {
    await fetchProduct()
  }
})

onMounted(async () => {
  await fetchProduct()
})

onUnmounted(() => {
  trackPageLeave()
})
</script>

<style scoped>
.product-detail-container {
  padding: 20px 0;
}

.product-header {
  margin-bottom: 20px;
}

.back-btn {
  background: none;
  border: none;
  color: #667eea;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.product-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  margin-bottom: 40px;
}

.product-image-wrapper {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
}

.product-image {
  width: 100%;
  height: 400px;
  object-fit: contain;
}

.product-info {
  display: flex;
  flex-direction: column;
}

.product-name {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 16px;
}

.product-category {
  font-size: 14px;
  color: #666;
  margin-bottom: 16px;
}

.product-price {
  font-size: 36px;
  font-weight: bold;
  color: #e74c3c;
  margin-bottom: 16px;
}

.product-stock {
  font-size: 16px;
  margin-bottom: 20px;
}

.product-stock.low {
  color: #e74c3c;
}

.product-description {
  font-size: 16px;
  line-height: 1.8;
  color: #555;
  margin-bottom: 24px;
  flex: 1;
}

.quantity-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.quantity-section span {
  font-size: 16px;
}

.qty-btn {
  width: 36px;
  height: 36px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  font-size: 20px;
  cursor: pointer;
}

.qty-value {
  font-size: 18px;
  font-weight: bold;
  min-width: 40px;
  text-align: center;
}

.action-buttons {
  display: flex;
  gap: 16px;
}

.add-cart-btn {
  flex: 1;
  background: #667eea;
  color: white;
  padding: 14px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.3s;
}

.add-cart-btn:hover:not(:disabled) {
  background: #5a6fd6;
}

.add-cart-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.buy-now-btn {
  flex: 1;
  background: #e74c3c;
  color: white;
  padding: 14px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.3s;
}

.buy-now-btn:hover:not(:disabled) {
  background: #d63031;
}

.buy-now-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.related-section {
  margin-top: 40px;
}

.related-section h2 {
  font-size: 24px;
  margin-bottom: 20px;
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.related-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.3s;
}

.related-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.related-image {
  width: 100%;
  height: 150px;
  object-fit: cover;
}

.related-name {
  padding: 12px;
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.related-price {
  padding: 0 12px 12px;
  font-size: 16px;
  font-weight: bold;
  color: #e74c3c;
}

.loading-state {
  text-align: center;
  padding: 100px 20px;
}

.loading-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}
</style>