<script setup lang="ts">
import { onMounted } from 'vue'
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// 初始化时获取用户信息
onMounted(async () => {
  if (authStore.isAuthenticated && !authStore.user) {
    await authStore.fetchUser()
  }
})
</script>

<template>
  <div class="admin-layout">
    <!-- 侧边栏 -->
    <Sidebar />

    <!-- 主内容区 -->
    <div class="main-wrapper">
      <!-- 顶栏 -->
      <Header />

      <!-- 页面内容 -->
      <main class="main-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: #f8fafc;
}

.main-wrapper {
  flex: 1;
  margin-left: 260px; /* 侧边栏宽度 */
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

/* 响应式：小屏幕隐藏侧边栏 */
@media (max-width: 1024px) {
  .main-wrapper {
    margin-left: 0;
  }
}
</style>
