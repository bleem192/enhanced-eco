import api from '@/api';
import { useAuthStore } from '@/stores/auth';

let sessionId = generateSessionId();
let pageStartTime = Date.now();
let currentProduct = null;

function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

export function getSessionId() {
  return sessionId;
}

export function trackPageView(pageUrl, productInfo = null) {
  const authStore = useAuthStore();
  const user = authStore.user;
  
  currentProduct = productInfo;
  pageStartTime = Date.now();
  
  const data = {
    user_id: user?.id || null,
    username: user?.username || 'anonymous',
    product_id: productInfo?.id || null,
    product_name: productInfo?.name || null,
    category: productInfo?.category || null,
    page_url: pageUrl,
    session_id: sessionId
  };
  
  api.behavior.recordView(data).catch(() => {});
}

export function trackPageLeave() {
  if (!currentProduct) return;
  
  const authStore = useAuthStore();
  const user = authStore.user;
  const duration = Math.floor((Date.now() - pageStartTime) / 1000);
  
  if (duration >= 1) {
    const data = {
      user_id: user?.id || null,
      username: user?.username || 'anonymous',
      product_id: currentProduct.id,
      product_name: currentProduct.name,
      category: currentProduct.category,
      page_url: window.location.pathname,
      session_id: sessionId,
      duration
    };
    
    api.behavior.recordViewDuration(data).catch(() => {});
  }
  
  currentProduct = null;
}

export function trackPurchase(orderId, items, totalAmount) {
  const authStore = useAuthStore();
  const user = authStore.user;
  
  const data = {
    user_id: user?.id,
    username: user?.username,
    order_id: orderId,
    items: items.map(item => ({
      product_id: item.product_id,
      product_name: item.product_name,
      category: item.category,
      price: item.price,
      quantity: item.quantity
    })),
    total_amount: totalAmount
  };
  
  api.behavior.recordPurchase(data).catch(() => {});
}

export function resetSession() {
  sessionId = generateSessionId();
  currentProduct = null;
}

export default {
  getSessionId,
  trackPageView,
  trackPageLeave,
  trackPurchase,
  resetSession
};