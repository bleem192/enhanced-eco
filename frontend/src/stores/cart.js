import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api'

export const useCartStore = defineStore('cart', () => {
  const items = ref([])

  const totalItems = computed(() => {
    return items.value.reduce((sum, item) => sum + item.quantity, 0)
  })

  const totalPrice = computed(() => {
    return items.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  })

  const fetchCart = async () => {
    try {
      const response = await api.cart.getCart()
      if (response.success) {
        items.value = response.data
      }
    } catch (error) {
      console.error('获取购物车失败:', error)
    }
  }

  const addToCart = async (productId, quantity = 1) => {
    try {
      const response = await api.cart.addToCart({ product_id: productId, quantity })
      if (response.success) {
        await fetchCart()
      }
      return response.success
    } catch (error) {
      console.error('添加购物车失败:', error)
      return false
    }
  }

  const updateCartItem = async (cartId, quantity) => {
    try {
      const response = await api.cart.updateCartItem(cartId, { quantity })
      if (response.success) {
        await fetchCart()
      }
      return response.success
    } catch (error) {
      console.error('更新购物车失败:', error)
      return false
    }
  }

  const removeFromCart = async (cartId) => {
    try {
      const response = await api.cart.removeFromCart(cartId)
      if (response.success) {
        await fetchCart()
      }
      return response.success
    } catch (error) {
      console.error('删除购物车失败:', error)
      return false
    }
  }

  const clearCart = async () => {
    try {
      const response = await api.cart.clearCart()
      if (response.success) {
        items.value = []
      }
      return response.success
    } catch (error) {
      console.error('清空购物车失败:', error)
      return false
    }
  }

  return {
    items,
    totalItems,
    totalPrice,
    fetchCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart
  }
})