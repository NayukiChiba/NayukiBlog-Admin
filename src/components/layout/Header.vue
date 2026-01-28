<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSidebarStore } from '@/stores/sidebar'

const route = useRoute()
const sidebarStore = useSidebarStore()

// 页面标题映射
const titleMap: Record<string, string> = {
  dashboard: '仪表盘',
  articles: '文章管理',
  'article-new': '新建文章',
  'article-edit': '编辑文章',
  diaries: '日记管理',
  projects: '项目管理',
  books: '书籍管理',
  gallery: '图库管理',
  todos: '待办管理',
  tools: '工具管理',
}

// 当前页面标题
const pageTitle = computed(() => {
  const name = route.name as string
  return titleMap[name] || '管理后台'
})

// 面包屑
const breadcrumbs = computed(() => {
  const crumbs = [{ label: '首页', path: '/' }]
  const name = route.name as string

  if (name !== 'dashboard') {
    crumbs.push({ label: pageTitle.value, path: route.path })
  }

  return crumbs
})
</script>

<template>
  <header class="header">
    <div class="header-left">
      <!-- 汉堡菜单按钮（移动端） -->
      <button class="menu-btn" @click="sidebarStore.toggle" title="菜单">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      <div class="header-info">
        <!-- 面包屑 -->
        <nav class="breadcrumb">
        <template v-for="(crumb, index) in breadcrumbs" :key="crumb.path">
          <router-link
            v-if="index < breadcrumbs.length - 1"
            :to="crumb.path"
            class="breadcrumb-link"
          >
            {{ crumb.label }}
          </router-link>
          <span v-else class="breadcrumb-current">{{ crumb.label }}</span>
          <span v-if="index < breadcrumbs.length - 1" class="breadcrumb-separator">/</span>
        </template>
        </nav>

        <!-- 页面标题 -->
        <h1 class="page-title">{{ pageTitle }}</h1>
      </div>
    </div>

    <div class="header-right">
      <!-- 刷新按钮 -->
      <button class="header-btn" title="刷新页面" @click="$router.go(0)">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
      </button>

      <!-- GitHub 链接 -->
      <a
        href="https://github.com/NayukiChiba/NayukiBlog"
        target="_blank"
        rel="noopener noreferrer"
        class="header-btn"
        title="查看 GitHub 仓库"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
        </svg>
      </a>

      <!-- 博客链接 -->
      <a
        href="https://nayuki.blog"
        target="_blank"
        rel="noopener noreferrer"
        class="header-btn"
        title="访问博客"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      </a>
    </div>
  </header>
</template>

<style scoped>
.header {
  height: 64px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  position: sticky;
  top: 0;
  z-index: 50;
  gap: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  min-width: 0;
}

.menu-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 0.5rem;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.menu-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.breadcrumb-link {
  color: #64748b;
  text-decoration: none;
  transition: color 0.2s ease;
}

.breadcrumb-link:hover {
  color: #2563eb;
}

.breadcrumb-separator {
  color: #cbd5e1;
}

.breadcrumb-current {
  color: #94a3b8;
}

.page-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 0.5rem;
  color: #64748b;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s ease;
}

.header-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

/* 响应式 */
@media (max-width: 1024px) {
  .menu-btn {
    display: flex;
  }

  .header {
    padding: 0 1rem;
  }
}

@media (max-width: 640px) {
  .breadcrumb {
    display: none;
  }

  .page-title {
    font-size: 1.125rem;
  }

  .header-right {
    gap: 0.25rem;
  }

  .header-btn {
    width: 32px;
    height: 32px;
  }

  .header-btn svg {
    width: 16px;
    height: 16px;
  }
}
</style>
