<template>
  <div class="products-container">
    <div class="search-section">
      <input 
        v-model="searchKeyword" 
        type="text" 
        placeholder="搜索商品..." 
        class="search-input"
        @keyup.enter="handleSearch"
      />
      <button class="search-btn" @click="handleSearch">搜索</button>
    </div>

    <div class="filter-section">
      <select v-model="selectedCategory" class="category-select" @change="handleFilter">
        <option value="">全部分类</option>
        <option v-for="item in categories" :key="item.category" :value="item.category">
          {{ item.category }}
        </option>
      </select>
      <div class="sort-options">
        <span>排序:</span>
        <button 
          v-for="option in sortOptions" 
          :key="option.value"
          :class="['sort-btn', { active: sortBy === option.value }]"
          @click="sortBy = option.value; handleFilter()"
        >
          {{ option.label }}
        </button>
      </div>
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
          <p class="product-stock" :class="{ low: product.stock < 10 }">
            库存: {{ product.stock }}
          </p>
          <button class="add-cart-btn" @click.stop="handleAddToCart(product.id)">
            加入购物车
          </button>
        </div>
      </div>
    </div>

    <div v-if="products.length === 0" class="empty-state">
      <span class="empty-icon">📭</span>
      <p>暂无商品</p>
    </div>

    <div v-if="total > limit" class="pagination">
      <button 
        :disabled="currentPage === 1" 
        class="page-btn"
        @click="currentPage--; handleFilter()"
      >
        上一页
      </button>
      <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
      <button 
        :disabled="currentPage >= totalPages" 
        class="page-btn"
        @click="currentPage++; handleFilter()"
      >
        下一页
      </button>
    </div>
  </div>
</template>

<script setup>import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useCartStore } from '@/stores/cart';
import api from '@/api';
import { ElMessage } from 'element-plus';
const router = useRouter();
const authStore = useAuthStore();
const cartStore = useCartStore();
const searchKeyword = ref('');
const selectedCategory = ref('');
const sortBy = ref('created_at');
const currentPage = ref(1);
const limit = ref(12);
const categories = ref([]);
const products = ref([]);
const total = ref(0);
const sortOptions = [
 { label: '最新上架', value: 'created_at' },
 { label: '价格从低到高', value: 'price_asc' },
 { label: '价格从高到低', value: 'price_desc' }
];
const totalPages = computed(() => Math.ceil(total.value / limit.value));
const goToProduct = (id) => {
 router.push(`/product/${id}`);
};
const handleSearch = () => {
 currentPage.value = 1;
 handleFilter();
};
const handleFilter = async () => {
 try {
 const params = {
 page: currentPage.value,
 limit: limit.value,
 category: selectedCategory.value || undefined,
 keyword: searchKeyword.value || undefined,
 sort: sortBy.value
 };
 const response = await api.products.getProducts(params);
 if (response.success) {
 products.value = response.data.list;
 total.value = response.data.total;
 }
 }
 catch (error) {
 console.error('获取商品失败:', error);
 }
};
const handleAddToCart = async (productId) => {
 if (!authStore.isLoggedIn) {
 ElMessage.warning('请先登录');
 router.push('/login');
 return;
 }
 const success = await cartStore.addToCart(productId, 1);
 if (success) {
 ElMessage.success('已添加到购物车');
 }
 else {
 ElMessage.error('添加失败');
 }
};
const fetchCategories = async () => {
 try {
 const response = await api.products.getCategories();
 if (response.success) {
 categories.value = response.data;
 }
 }
 catch (error) {
 console.error('获取分类失败:', error);
 }
};
onMounted(async () => {
 await fetchCategories();
 await handleFilter();
});
</script>

<style scoped>
.products-container {
  padding: 20px 0;
}

.search-section {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.search-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
}

.search-btn {
  background: #667eea;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s;
}

.search-btn:hover {
  background: #5a6fd6;
}

.filter-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.category-select {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.sort-options {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
}

.sort-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.product-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.3s;
}

.product-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.product-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.product-info {
  padding: 16px;
}

.product-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-category {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.product-price {
  font-size: 20px;
  font-weight: bold;
  color: #e74c3c;
  margin-bottom: 8px;
}

.product-stock {
  font-size: 12px;
  color: #888;
  margin-bottom: 12px;
}

.product-stock.low {
  color: #e74c3c;
}

.add-cart-btn {
  width: 100%;
  background: #667eea;
  color: white;
  padding: 10px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;
}

.add-cart-btn:hover {
  background: #5a6fd6;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

.empty-state p {
  color: #666;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 30px;
}

.page-btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: #666;
}
</style>