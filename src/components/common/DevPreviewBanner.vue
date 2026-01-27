<script setup lang="ts">
import { useRouter } from "vue-router";

interface Props {
  isPreviewMode: boolean;
  isLoggedIn: boolean;
  showLoginLink?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showLoginLink: true,
});

const emit = defineEmits<{
  exitPreview: [];
}>();

const router = useRouter();

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

  <!-- 未登录提示（非预览模式） -->
  <div v-else-if="!isPreviewMode && !isLoggedIn" class="dev-preview-banner warning">
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
      <span v-else @click="goToLogin" class="banner-link" style="cursor: pointer"
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
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.dev-preview-banner.preview {
  background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%);
  border: 1px solid #bfdbfe;
  color: #1e40af;
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

.exit-preview-btn {
  padding: 0.375rem 0.75rem;
  background: white;
  border: 1px solid currentColor;
  border-radius: 0.375rem;
  color: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.exit-preview-btn:hover {
  background: #1e40af;
  border-color: #1e40af;
  color: white;
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
