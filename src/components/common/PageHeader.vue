<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <div class="page-header">
    <div class="header-content">
      <h1 class="page-title">{{ title }}</h1>
      <p v-if="description" class="page-description">{{ description }}</p>
    </div>
    <div class="header-actions">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 16px;
  animation: headerIn 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes headerIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 左侧纯色竖条装饰 */
.header-content {
  position: relative;
  flex: 1;
  padding-left: 16px;
}

.header-content::before {
  content: '';
  position: absolute;
  left: 0;
  top: 3px;
  bottom: 3px;
  width: 4px;
  border-radius: 999px;
  background: #4c5670;
  opacity: 0.85;
  pointer-events: none;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #14161f;
  margin: 0 0 4px 0;
}

.page-description {
  color: #8b91a5;
  font-size: 14px;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-header {
    animation: none;
  }
}
</style>
