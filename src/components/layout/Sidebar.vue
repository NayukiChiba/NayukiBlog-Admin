<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSidebarStore } from '@/stores/sidebar'
import { usePendingChangesStore } from '@/stores/pendingChanges'
import { CommitModal } from '@/components/common'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const sidebarStore = useSidebarStore()
const pendingChangesStore = usePendingChangesStore()

// Git 模态框状态
const showCommitModal = ref(false)

// 导航菜单项
const menuItems = [
  { name: 'dashboard', path: '/', icon: 'dashboard', label: '仪表盘' },
  { name: 'articles', path: '/articles', icon: 'article', label: '文章管理' },
  { name: 'diaries', path: '/diaries', icon: 'diary', label: '日记管理' },
  { name: 'projects', path: '/projects', icon: 'project', label: '项目管理' },
  { name: 'books', path: '/books', icon: 'book', label: '书籍管理' },
  { name: 'gallery', path: '/gallery', icon: 'gallery', label: '图库管理' },
  { name: 'todos', path: '/todos', icon: 'todo', label: '待办管理' },
  { name: 'tools', path: '/tools', icon: 'tool', label: '工具管理' },
]

// 当前激活的菜单
const activeMenu = computed(() => route.name)

// 登出
function handleLogout() {
  authStore.logout()
  router.push('/login')
}

// 点击菜单项时关闭 Sidebar（移动端）
function handleMenuClick() {
  sidebarStore.close()
}
</script>

<template>
  <!-- 遮罩层（移动端） -->
  <div
    v-if="sidebarStore.isOpen"
    class="sidebar-overlay"
    @click="sidebarStore.close"
  ></div>

  <!-- 侧边栏 -->
  <aside :class="['sidebar', { open: sidebarStore.isOpen }]">
    <!-- Logo -->
    <div class="sidebar-header">
      <div class="logo">
        <span class="logo-icon">✨</span>
        <span class="logo-text">Nayuki Admin</span>
      </div>
    </div>

    <!-- 导航菜单 -->
    <nav class="sidebar-nav">
      <ul class="nav-list">
        <li v-for="item in menuItems" :key="item.name">
          <router-link
            :to="item.path"
            :class="['nav-item', { active: activeMenu === item.name }]"
            @click="handleMenuClick"
          >
            <!-- 图标 -->
            <span class="nav-icon">
              <!-- Dashboard -->
              <svg v-if="item.icon === 'dashboard'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              <!-- Article -->
              <svg v-else-if="item.icon === 'article'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <line x1="10" y1="9" x2="8" y2="9"></line>
              </svg>
              <!-- Diary -->
              <svg v-else-if="item.icon === 'diary'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
              <!-- Project -->
              <svg v-else-if="item.icon === 'project'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <!-- Book -->
              <svg v-else-if="item.icon === 'book'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
              <!-- Gallery -->
              <svg v-else-if="item.icon === 'gallery'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <!-- Todo -->
              <svg v-else-if="item.icon === 'todo'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <!-- Tool -->
              <svg v-else-if="item.icon === 'tool'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
              </svg>
            </span>
            <span class="nav-label">{{ item.label }}</span>
          </router-link>
        </li>
      </ul>
    </nav>

    <!-- 底部用户信息 -->
    <div class="sidebar-footer">
      <div v-if="authStore.user" class="user-info">
        <img
          :src="authStore.user.avatar_url"
          :alt="authStore.user.name"
          class="user-avatar"
        />
        <div class="user-details">
          <span class="user-name">{{ authStore.user.name }}</span>
          <span class="user-login">@{{ authStore.user.login }}</span>
        </div>
      </div>
      <button class="git-btn" :class="{ 'has-changes': pendingChangesStore.hasChanges }" @click="showCommitModal = true" title="提交变更">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="4"></circle>
          <line x1="1.05" y1="12" x2="7" y2="12"></line>
          <line x1="17.01" y1="12" x2="22.96" y2="12"></line>
        </svg>
        <span v-if="pendingChangesStore.hasChanges" class="changes-badge">{{ pendingChangesStore.changesCount }}</span>
      </button>
      <button class="logout-btn" @click="handleLogout" title="退出登录">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
      </button>
    </div>
  </aside>

  <!-- Git 提交模态框 -->
  <CommitModal :show="showCommitModal" @close="showCommitModal = false" />
</template>

<style scoped>
/* 遮罩层 */
.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 99;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 侧边栏 */
.sidebar {
  width: 260px;
  height: 100vh;
  background: white;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
  transition: transform 0.3s ease;
}

.sidebar-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  font-size: 1.5rem;
}

.logo-text {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
}

.sidebar-nav {
  flex: 1;
  padding: 1rem 0.75rem;
  overflow-y: auto;
}

.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #64748b;
  border-radius: 0.5rem;
  text-decoration: none;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.nav-item.active {
  background: #eff6ff;
  color: #2563eb;
}

.nav-item.active .nav-icon {
  color: #2563eb;
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  transition: color 0.2s ease;
}

.nav-item:hover .nav-icon {
  color: #64748b;
}

.nav-label {
  flex: 1;
}

.sidebar-footer {
  padding: 1rem 1.25rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.user-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-login {
  font-size: 0.75rem;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 0.5rem;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  background: #fef2f2;
  color: #ef4444;
}

.git-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 0.5rem;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s ease;
}

.git-btn:hover {
  background: #f0fdf4;
  color: #22c55e;
}

.git-btn.has-changes {
  color: #f59e0b;
}

.git-btn.has-changes:hover {
  background: #fffbeb;
  color: #d97706;
}

.changes-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-size: 10px;
  font-weight: 600;
  line-height: 16px;
  text-align: center;
  color: white;
  background: #ef4444;
  border-radius: 9999px;
}

/* 响应式：移动端 */
@media (max-width: 1024px) {
  .sidebar-overlay {
    display: block;
  }

  .sidebar {
    transform: translateX(-100%);
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  }

  .sidebar.open {
    transform: translateX(0);
  }
}
</style>
