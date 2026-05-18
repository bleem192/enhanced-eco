<template>
  <div class="analytics-container">
    <h1>数据分析</h1>
    
    <div class="stats-overview">
      <div class="stat-card">
        <span class="stat-icon">💰</span>
        <div class="stat-info">
          <p class="stat-value">¥{{ parseFloat(analytics.overview?.total_revenue || 0).toFixed(2) }}</p>
          <p class="stat-label">总销售额</p>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">📦</span>
        <div class="stat-info">
          <p class="stat-value">{{ analytics.overview?.total_orders || 0 }}</p>
          <p class="stat-label">订单总数</p>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">👥</span>
        <div class="stat-info">
          <p class="stat-value">{{ analytics.overview?.unique_customers || 0 }}</p>
          <p class="stat-label">活跃用户</p>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">⭐</span>
        <div class="stat-info">
          <p class="stat-value">{{ parseFloat(analytics.overview?.avg_order_value || 0).toFixed(2) }}</p>
          <p class="stat-label">客单价</p>
        </div>
      </div>
    </div>

    <div class="charts-section">
      <div class="chart-card">
        <h3>销售趋势</h3>
        <div ref="salesChartRef" class="chart"></div>
      </div>
      <div class="chart-card">
        <h3>商品分类占比</h3>
        <div ref="categoryChartRef" class="chart"></div>
      </div>
    </div>

    <div class="bottom-section">
      <div class="ranking-card">
        <h3>热门商品 TOP 10</h3>
        <ul class="ranking-list">
          <li v-for="(product, index) in analytics.top_products" :key="product.id" class="ranking-item">
            <span class="rank">{{ index + 1 }}</span>
            <span class="product-name">{{ product.name }}</span>
            <span class="product-sales">{{ product.sales_count }} 件</span>
          </li>
        </ul>
      </div>
      
      <div class="ranking-card">
        <h3>活跃用户 TOP 10</h3>
        <ul class="ranking-list">
          <li v-for="(user, index) in analytics.top_customers" :key="user.id" class="ranking-item">
            <span class="rank">{{ index + 1 }}</span>
            <span class="product-name">{{ user.username }}</span>
            <span class="product-sales">¥{{ parseFloat(user.total_spent || 0).toFixed(2) }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div class="recommend-section">
      <h3>推荐策略配置</h3>
      <div class="strategy-cards">
        <div class="strategy-card">
          <h4>协同过滤推荐</h4>
          <p>基于用户购买行为的相似性推荐</p>
          <button class="strategy-btn" @click="triggerRecommend('collaborative')">执行推荐</button>
        </div>
        <div class="strategy-card">
          <h4>内容推荐</h4>
          <p>基于商品特征的相似性推荐</p>
          <button class="strategy-btn" @click="triggerRecommend('content')">执行推荐</button>
        </div>
        <div class="strategy-card">
          <h4>热门商品推荐</h4>
          <p>基于销量的热门商品推荐</p>
          <button class="strategy-btn" @click="triggerRecommend('popular')">执行推荐</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import api from '@/api'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'

const analytics = ref({})
const salesChartRef = ref(null)
const categoryChartRef = ref(null)

const initSalesChart = () => {
  if (!salesChartRef.value) return
  const chart = echarts.init(salesChartRef.value)
  
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  const data = analytics.value.sales_trend || [1200, 1320, 1010, 1340, 1900, 2300, 2200, 1820, 1900, 2300, 2500, 3000]
  
  chart.setOption({
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value' },
    series: [{
      data,
      type: 'line',
      smooth: true,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(102, 126, 234, 0.3)' },
          { offset: 1, color: 'rgba(102, 126, 234, 0.05)' }
        ])
      },
      itemStyle: { color: '#667eea' }
    }]
  })
}

const initCategoryChart = () => {
  if (!categoryChartRef.value) return
  const chart = echarts.init(categoryChartRef.value)
  
  const data = analytics.value.category_distribution || [
    { name: '电子产品', value: 35 },
    { name: '服装', value: 25 },
    { name: '食品', value: 20 },
    { name: '家居', value: 15 },
    { name: '其他', value: 5 }
  ]
  
  chart.setOption({
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: { show: true },
      data
    }]
  })
}

const fetchAnalytics = async () => {
  const response = await api.analysis.getOverview()
  if (response.success) {
    analytics.value = response.data
    await nextTick()
    initSalesChart()
    initCategoryChart()
  }
}

const triggerRecommend = async (strategy) => {
  const response = await api.analysis.triggerRecommend({ strategy })
  if (response.success) {
    ElMessage.success(`${strategy}推荐执行成功`)
    await fetchAnalytics()
  } else {
    ElMessage.error('推荐执行失败')
  }
}

onMounted(async () => {
  await fetchAnalytics()
  
  window.addEventListener('resize', () => {
    initSalesChart()
    initCategoryChart()
  })
})
</script>

<style scoped>
.analytics-container {
  padding: 20px 0;
}

.analytics-container h1 {
  font-size: 28px;
  margin-bottom: 20px;
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
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

.charts-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.chart-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.chart-card h3 {
  margin-bottom: 16px;
}

.chart {
  height: 300px;
}

.bottom-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.ranking-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.ranking-card h3 {
  margin-bottom: 16px;
}

.ranking-list {
  list-style: none;
  padding: 0;
}

.ranking-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.ranking-item:last-child {
  border-bottom: none;
}

.rank {
  width: 28px;
  height: 28px;
  background: #667eea;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  margin-right: 12px;
}

.product-name {
  flex: 1;
}

.product-sales {
  font-weight: bold;
  color: #667eea;
}

.recommend-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.recommend-section h3 {
  margin-bottom: 20px;
}

.strategy-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.strategy-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
}

.strategy-card h4 {
  margin-bottom: 8px;
}

.strategy-card p {
  font-size: 14px;
  color: #666;
  margin-bottom: 16px;
}

.strategy-btn {
  background: #667eea;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
</style>