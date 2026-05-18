<template>
  <div class="home-container">
    <div class="hero-section">
      <div class="hero-content">
        <h1>欢迎来到电商平台</h1>
        <p>发现优质商品，享受便捷购物体验</p>
        <router-link to="/products" class="hero-btn">立即购物</router-link>
      </div>
    </div>
    
    <div class="categories-section">
      <h2>热门分类</h2>
      <div class="categories-grid">
        <div 
          v-for="item in categories" 
          :key="item.category" 
          class="category-card"
          @click="goToCategory(item.category)"
        >
          <span class="category-icon">📦</span>
          <span class="category-name">{{ item.category }}</span>
          <span class="category-count">{{ item.product_count }}件商品</span>
        </div>
      </div>
    </div>

    <div class="products-section">
      <div class="section-header">
        <h2>热门商品</h2>
        <router-link to="/products" class="view-all">查看全部 →</router-link>
      </div>
      <div class="products-grid">
        <div 
          v-for="product in products" 
          :key="product.id" 
          class="product-card"
          @click="goToProduct(product.id)"
        >
          <img :src="product.image_url || 'https://via.placeholder.com/200'" :alt="product.name" class="product-image" width="200" height="200" />
          <div class="product-info">
            <h3 class="product-name">{{ product.name }}</h3>
            <p class="product-category">{{ product.category }}</p>
            <p class="product-price">¥{{ parseFloat(product.price).toFixed(2) }}</p>
            <p class="product-stock">库存: {{ product.stock }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="recommendations.length > 0" class="recommendations-section">
      <h2>为您推荐</h2>
      <div class="products-grid">
        <div 
          v-for="product in recommendations" 
          :key="product.id" 
          class="product-card"
          @click="goToProduct(product.id)"
        >
          <img :src="product.image_url || 'https://via.placeholder.com/200'" :alt="product.name" class="product-image" width="200" height="200" />
          <div class="product-info">
            <h3 class="product-name">{{ product.name }}</h3>
            <p class="product-category">{{ product.category }}</p>
            <p class="product-price">¥{{ parseFloat(product.price).toFixed(2) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/api'

const router = useRouter()
const authStore = useAuthStore()

const categories = ref([])
const products = ref([])
const recommendations = ref([])

const goToCategory = (category) => {
  router.push(`/products?category=${category}`)
}

const goToProduct = (id) => {
  router.push(`/product/${id}`)
}

const fetchCategories = async () => {
  try {
    const response = await api.products.getCategories()
    if (response.success) {
      categories.value = response.data
    }
  } catch (error) {
    console.error('获取分类失败:', error)
  }
}

const fetchProducts = async () => {
  try {
    const response = await api.products.getProducts({ limit: 6 })
    if (response.success) {
      products.value = response.data.list
    }
  } catch (error) {
    console.error('获取商品失败:', error)
  }
}

const fetchRecommendations = async () => {
  if (!authStore.isLoggedIn) return
  try {
    const response = await api.analysis.getRecommendations()
    if (response.success) {
      recommendations.value = response.data.products
    }
  } catch (error) {
    console.error('获取推荐失败:', error)
  }
}

onMounted(async () => {
  await Promise.all([
    fetchCategories(),
    fetchProducts(),
    fetchRecommendations()
  ])
})
</script>

<style scoped>
.home-container {
  padding: 20px 0;
}

.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 60px 20px;
  text-align: center;
  border-radius: 12px;
  margin-bottom: 30px;
}

.hero-content h1 {
  color: white;
  font-size: 36px;
  margin-bottom: 10px;
}

.hero-content p {
  color: rgba(255, 255, 255, 0.8);
  font-size: 18px;
  margin-bottom: 20px;
}

.hero-btn {
  background: white;
  color: #667eea;
  padding: 12px 32px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
}

.categories-section {
  margin-bottom: 30px;
}

.categories-section h2 {
  margin-bottom: 20px;
  font-size: 24px;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 20px;
}

.category-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.3s;
}

.category-card:hover {
  transform: translateY(-5px);
}

.category-icon {
  font-size: 40px;
  display: block;
  margin-bottom: 10px;
}

.category-name {
  display: block;
  font-weight: 600;
  margin-bottom: 5px;
}

.category-count {
  font-size: 12px;
  color: #666;
}

.products-section {
  margin-bottom: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  font-size: 24px;
}

.view-all {
  color: #667eea;
  text-decoration: none;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.product-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s;
}

.product-card:hover {
  transform: translateY(-5px);
}

.product-image {
  width: 100%;
  height: 150px;
  object-fit: cover;
}

.product-info {
  padding: 15px;
}

.product-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-category {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.product-price {
  font-size: 18px;
  font-weight: bold;
  color: #e74c3c;
}

.product-stock {
  font-size: 12px;
  color: #666;
  margin-top: 5px;
}

.recommendations-section {
  margin-top: 30px;
}

.recommendations-section h2 {
  margin-bottom: 20px;
  font-size: 24px;
}
</style>
