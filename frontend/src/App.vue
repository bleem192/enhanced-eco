<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-content">
        <div class="logo" @click="goHome">
          <span class="logo-icon">🛒</span>
          <span class="logo-text">电商平台</span>
        </div>
        <nav class="nav-links">
          <router-link to="/" class="nav-link">首页</router-link>
          <router-link to="/products" class="nav-link">商品</router-link>
          <router-link to="/analysis" v-if="authStore.user?.role === 'admin'" class="nav-link">数据分析</router-link>
          <router-link to="/sales" v-if="authStore.user?.role === 'sales'" class="nav-link">销售管理</router-link>
          <router-link to="/admin" v-if="authStore.user?.role === 'admin'" class="nav-link">后台管理</router-link>
        </nav>
        <div class="header-right">
          <div v-if="authStore.isLoggedIn" class="user-info">
            <router-link to="/cart" v-if="authStore.user?.role === 'customer'" class="cart-link">
              <span>🛒</span>
              <span v-if="cartStore.totalItems > 0" class="cart-badge">{{ cartStore.totalItems }}</span>
            </router-link>
            <router-link to="/orders" class="order-link">我的订单</router-link>
            <span class="username">{{ authStore.user?.username }}</span>
            <button class="logout-btn" @click="handleLogout">退出</button>
          </div>
          <div v-else class="auth-links">
            <router-link to="/login" class="auth-link">登录</router-link>
            <router-link to="/register" class="auth-link register">注册</router-link>
          </div>
        </div>
      </div>
    </header>
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <footer class="app-footer">
      <p>© 2026 电商平台 - 网络应用架构设计与开发课程设计</p>
    </footer>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const cartStore = useCartStore()
const router = useRouter()

const goHome = () => {
  router.push('/')
}

const handleLogout = async () => {
  await authStore.logout()
  router.push('/')
}

onMounted(async () => {
  if (authStore.token && !authStore.user) {
    await authStore.getProfile()
  }
  if (authStore.isLoggedIn && authStore.user?.role === 'customer') {
    await cartStore.fetchCart()
  }
})
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
}

.logo {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 8px;
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  font-size: 20px;
  font-weight: bold;
}

.nav-links {
  display: flex;
  gap: 20px;
}

.nav-link {
  color: white;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 4px;
  transition: background 0.3s;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.2);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.cart-link {
  position: relative;
  color: white;
  text-decoration: none;
  font-size: 20px;
}

.cart-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: red;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.order-link {
  color: white;
  text-decoration: none;
  padding: 8px 16px;
}

.username {
  font-weight: 500;
}

.logout-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.auth-links {
  display: flex;
  gap: 16px;
}

.auth-link {
  color: white;
  text-decoration: none;
  padding: 8px 16px;
}

.auth-link.register {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.main-content {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 20px;
}

.app-footer {
  text-align: center;
  padding: 20px;
  background: #f5f5f5;
  color: #666;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>