<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'

const route = useRoute()

// 判断是否需要显示布局（登录页不需要）
const showLayout = computed(() => {
  return route.meta.requiresAuth !== false && route.name !== 'login'
})
</script>

<template>
  <div id="app" class="min-h-screen bg-slate-50">
    <!-- 带侧边栏的管理布局 -->
    <AdminLayout v-if="showLayout">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </AdminLayout>

    <!-- 无布局页面（如登录页） -->
    <template v-else>
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </template>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
