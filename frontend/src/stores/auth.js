import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || null)

  const isLoggedIn = computed(() => !!token.value && !!user.value)

  const login = async (username, password) => {
    try {
      const response = await api.auth.login({ username, password })
      if (response.success) {
        user.value = response.data.user
        token.value = response.data.token
        localStorage.setItem('token', token.value)
        return true
      }
      return false
    } catch (error) {
      console.error('登录失败:', error)
      return false
    }
  }

  const register = async (username, email, password, role = 'customer') => {
    try {
      const response = await api.auth.register({ username, email, password, role })
      if (response.success) {
        user.value = response.data
        token.value = response.data.token
        localStorage.setItem('token', token.value)
        return true
      }
      return false
    } catch (error) {
      console.error('注册失败:', error)
      return false
    }
  }

  const logout = async () => {
    try {
      await api.auth.logout()
    } catch (error) {
      console.error('注销失败:', error)
    } finally {
      user.value = null
      token.value = null
      localStorage.removeItem('token')
    }
  }

  const getProfile = async () => {
    try {
      const response = await api.auth.getProfile()
      if (response.success) {
        user.value = response.data
        return true
      }
      return false
    } catch (error) {
      console.error('获取用户信息失败:', error)
      return false
    }
  }

  return {
    user,
    token,
    isLoggedIn,
    login,
    register,
    logout,
    getProfile
  }
})