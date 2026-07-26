<script setup lang="ts">
import { useRouter } from "vue-router";

interface Props {
  isPreviewMode: boolean;
  isLoggedIn: boolean;
  showLoginLink?: boolean;
}

withDefaults(defineProps<Props>(), {
  showLoginLink: true,
});

const emit = defineEmits<{
  exitPreview: [];
}>();

const router = useRouter();

// 本地开发构建标记（vite dev 下为 true）
const isLocalDev = import.meta.env.DEV;

function exitPreviewMode() {
  localStorage.removeItem("dev_preview");
  emit("exitPreview");
  router.push("/login");
}

function goToLogin() {
  router.push("/login");
}
</script>

<template>
  <!-- 开发预览模式提示 -->
  <div v-if="isPreviewMode && !isLoggedIn" class="dev-preview-banner preview">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="banner-icon"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
    <span class="banner-text">
      开发预览模式 - 仅用于样式测试，数据功能需要
      <router-link v-if="showLoginLink" to="/login" class="banner-link"
        >登录</router-link
      >
      <span v-else>登录</span>
    </span>
    <button class="exit-preview-btn" @click="exitPreviewMode">退出预览</button>
  </div>

  <!-- 本地开发模式提示（vite dev 构建，无需 GitHub 验证） -->
  <div
    v-else-if="!isPreviewMode && !isLoggedIn && isLocalDev"
    class="dev-preview-banner dev"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="banner-icon"
    >
      <polyline points="16 18 22 12 16 6"></polyline>
      <polyline points="8 6 2 12 8 18"></polyline>
    </svg>
    <span class="banner-text">
      本地开发模式 - 已跳过 GitHub 验证，数据功能需要
      <router-link v-if="showLoginLink" to="/login" class="banner-link"
        >登录</router-link
      >
      <span v-else>登录</span>
    </span>
    <span class="dev-tag">DEV</span>
  </div>

  <!-- 未登录提示（非预览模式） -->
  <div
    v-else-if="!isPreviewMode && !isLoggedIn"
    class="dev-preview-banner warning"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="banner-icon"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
    <span class="banner-text">
      未登录，无法获取数据。请
      <router-link v-if="showLoginLink" to="/login" class="banner-link"
        >登录</router-link
      >
      <span
        v-else
        @click="goToLogin"
        class="banner-link"
        style="cursor: pointer"
        >登录</span
      >
      后查看。
    </span>
  </div>
</template>

<style scoped>
.dev-preview-banner {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.75rem 1rem;
  border-radius: 14px;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  animation: bannerIn 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes bannerIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dev-preview-banner.preview {
  background: rgba(147, 169, 201, 0.12);
  border: 1px solid rgba(76, 86, 112, 0.22);
  color: #414a61;
}

.dev-preview-banner.dev {
  background: rgba(147, 169, 201, 0.12);
  border: 1px dashed rgba(76, 86, 112, 0.35);
  color: #414a61;
}

.dev-preview-banner.warning {
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border: 1px solid #fcd34d;
  color: #92400e;
}

.banner-icon {
  flex-shrink: 0;
}

.banner-text {
  flex: 1;
}

.banner-link {
  color: inherit;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.banner-link:hover {
  opacity: 0.8;
}

.dev-tag {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  padding: 0.2rem 0.55rem;
  background: #4c5670;
  color: #ffffff;
  border-radius: 999px;
  flex-shrink: 0;
}

.exit-preview-btn {
  padding: 0.375rem 0.875rem;
  background: white;
  border: 1px solid currentColor;
  border-radius: 999px;
  color: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  white-space: nowrap;
}

.exit-preview-btn:hover {
  background: #4c5670;
  border-color: transparent;
  color: white;
  transform: translateY(-1px);
}

@media (prefers-reduced-motion: reduce) {
  .dev-preview-banner {
    animation: none;
  }
}

@media (max-width: 640px) {
  .dev-preview-banner {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .banner-text {
    flex: 1 1 calc(100% - 2rem);
  }

  .exit-preview-btn {
    margin-left: auto;
  }
}
</style>
