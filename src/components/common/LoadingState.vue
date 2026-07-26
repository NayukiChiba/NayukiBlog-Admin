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
  padding: 52px 24px;
  color: #8b91a5;
  gap: 14px;
}

.loading-small {
  padding: 24px 16px;
}

.loading-large {
  padding: 64px 32px;
}

/* 单色描边圆环 spinner */
.spinner {
  --ring-width: 3px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: var(--ring-width) solid #e6e8ee;
  border-top-color: #4c5670;
  animation: spin 0.9s linear infinite;
}

.loading-small .spinner {
  --ring-width: 2px;
  width: 20px;
  height: 20px;
}

.loading-large .spinner {
  --ring-width: 4px;
  width: 48px;
  height: 48px;
}

.loading-text {
  font-size: 14px;
  color: #8b91a5;
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

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation-duration: 1.6s;
  }
}
</style>
