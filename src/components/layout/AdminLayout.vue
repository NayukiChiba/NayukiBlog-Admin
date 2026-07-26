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
    <!-- 背景几何装饰（细线网格 + 极光光斑） -->
    <div class="layout-decor" aria-hidden="true">
      <div class="layout-grid geo-grid-bg"></div>
      <div class="layout-aurora layout-aurora-1"></div>
      <div class="layout-aurora layout-aurora-2"></div>
    </div>

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
  background: #f4f5fa;
  position: relative;
}

/* ===== 背景装饰层 ===== */
.layout-decor {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.layout-grid {
  position: absolute;
  inset: 0;
}

.layout-aurora {
  position: absolute;
  border-radius: 50%;
  filter: blur(110px);
}

.layout-aurora-1 {
  top: -22vmax;
  right: -12vmax;
  width: 42vmax;
  height: 42vmax;
  background: radial-gradient(circle, rgba(147, 169, 201, 0.13), transparent 70%);
}

.layout-aurora-2 {
  bottom: -18vmax;
  left: 8vmax;
  width: 36vmax;
  height: 36vmax;
  background: radial-gradient(circle, rgba(147, 169, 201, 0.09), transparent 70%);
}

.main-wrapper {
  flex: 1;
  margin-left: 260px; /* 侧边栏宽度 */
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: calc(100% - 260px);
  position: relative;
  z-index: 1;
}

.main-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

/* 响应式：移动端 */
@media (max-width: 1024px) {
  .main-wrapper {
    margin-left: 0;
    width: 100%;
  }
}

/* 小屏幕优化 */
@media (max-width: 640px) {
  .main-content {
    padding: 1rem;
  }
}
</style>
