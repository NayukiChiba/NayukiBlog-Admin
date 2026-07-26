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
  { name: 'rss', path: '/rss', icon: 'rss', label: 'RSS 订阅' },
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
        <span class="logo-mark" aria-hidden="true"></span>
        <span class="logo-text">Nayuki <span class="logo-thin">Admin</span></span>
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
              <!-- RSS -->
              <svg v-else-if="item.icon === 'rss'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 11a9 9 0 0 1 9 9"></path>
                <path d="M4 4a16 16 0 0 1 16 16"></path>
                <circle cx="5" cy="19" r="1"></circle>
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

/* 侧边栏 — 浅色玻璃（与博客端左栏一致的语言） */
.sidebar {
  width: 260px;
  height: 100vh;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(14px) saturate(1.4);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  border-right: 1px solid #f0f1f5;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

.sidebar-header {
  padding: 1.375rem 1.5rem;
  border-bottom: 1px solid #f0f1f5;
  position: relative;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

/* 几何 Logo 标记：墨蓝旋转方块 + 白色圆孔 */
.logo-mark {
  position: relative;
  width: 16px;
  height: 16px;
  border-radius: 5px;
  background: #4c5670;
  transform: rotate(45deg);
  flex-shrink: 0;
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.logo-mark::after {
  content: '';
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  background: #ffffff;
}

.logo:hover .logo-mark {
  transform: rotate(225deg);
}

.logo-text {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1a1d24;
  letter-spacing: -0.01em;
}

.logo-thin {
  font-weight: 500;
  color: #93a9c9;
}

.sidebar-nav {
  flex: 1;
  padding: 1rem 0.75rem;
  overflow-y: auto;
}

.sidebar-nav::-webkit-scrollbar {
  width: 6px;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background: #e6e8ee;
  border: none;
}

.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #4b5162;
  border-radius: 10px;
  text-decoration: none;
  transition: all 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}

.nav-item:hover {
  background: #f2f4f8;
  color: #1a1d24;
  transform: translateX(2px);
}

.nav-item.active {
  background: #eaeef4;
  color: #1a1d24;
  font-weight: 600;
}

/* active 左侧纯色指示条 */
.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 52%;
  border-radius: 999px;
  background: #4c5670;
}

.nav-item.active .nav-icon {
  color: #4c5670;
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9096a5;
  transition: color 0.2s ease;
}

.nav-item:hover .nav-icon {
  color: #4c5670;
}

.nav-label {
  flex: 1;
}

.sidebar-footer {
  padding: 1rem 1.25rem;
  border-top: 1px solid #f0f1f5;
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
  border-radius: 10px;
  object-fit: cover;
  border: 1px solid #e6e8ee;
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
  color: #1a1d24;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-login {
  font-size: 0.75rem;
  color: #9096a5;
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
  border-radius: 10px;
  color: #9096a5;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  background: #fdf0f0;
  color: #d4626a;
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
  border-radius: 10px;
  color: #9096a5;
  cursor: pointer;
  transition: all 0.2s ease;
}

.git-btn:hover {
  background: #eaeef4;
  color: #4c5670;
}

.git-btn.has-changes {
  color: #d99a2b;
}

.git-btn.has-changes:hover {
  background: #faf3e3;
  color: #c78a1f;
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
  background: #d4626a;
  border-radius: 9999px;
}

/* 响应式：移动端 */
@media (max-width: 1024px) {
  .sidebar-overlay {
    display: block;
  }

  .sidebar {
    background: #ffffff;
    transform: translateX(-100%);
    box-shadow: 8px 0 32px rgba(26, 29, 36, 0.12);
  }

  .sidebar.open {
    transform: translateX(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar,
  .nav-item,
  .nav-icon,
  .logo-mark {
    transition: none;
  }
}
</style>
