<script setup lang="ts">
defineProps<{
  text?: string;
  size?: 'small' | 'medium' | 'large';
}>();
</script>

<template>
  <div class="loading-state" :class="`loading-${size || 'medium'}`">
    <span class="spinner"></span>
    <span v-if="text" class="loading-text">{{ text }}</span>
    <slot></slot>
  </div>
</template>

<style scoped>
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: #6b7280;
  gap: 12px;
}

.loading-small {
  padding: 24px 16px;
}

.loading-large {
  padding: 64px 32px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-small .spinner {
  width: 20px;
  height: 20px;
  border-width: 2px;
}

.loading-large .spinner {
  width: 48px;
  height: 48px;
  border-width: 4px;
}

.loading-text {
  font-size: 14px;
  color: #6b7280;
}

.loading-small .loading-text {
  font-size: 12px;
}

.loading-large .loading-text {
  font-size: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
