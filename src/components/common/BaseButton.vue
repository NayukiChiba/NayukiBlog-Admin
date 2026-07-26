<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: boolean;
}>();
</script>

<template>
  <button
    class="btn"
    :class="[
      `btn-${variant || 'primary'}`,
      `btn-${size || 'medium'}`,
      { 'btn-loading': loading, 'btn-icon': icon }
    ]"
    :disabled="disabled || loading"
  >
    <span v-if="loading" class="spinner"></span>
    <slot></slot>
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 500;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Sizes */
.btn-small {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 10px;
}

.btn-medium {
  padding: 8px 16px;
  font-size: 14px;
}

.btn-large {
  padding: 12px 24px;
  font-size: 16px;
  border-radius: 14px;
}

/* Icon button */
.btn-icon.btn-small {
  padding: 6px;
  width: 28px;
  height: 28px;
}

.btn-icon.btn-medium {
  padding: 8px;
  width: 36px;
  height: 36px;
}

.btn-icon.btn-large {
  padding: 12px;
  width: 48px;
  height: 48px;
}

/* Variants */
/* 主按钮：雾蓝纯色底 + 白字，hover 上浮加深 */
.btn-primary {
  background: #4c5670;
  color: white;
  box-shadow: 0 4px 14px -6px rgba(76, 86, 112, 0.35);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #414a61;
  box-shadow: 0 12px 32px -12px rgba(26, 29, 36, 0.24);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

/* 次按钮：白底描边，hover 主题化 */
.btn-secondary {
  background: white;
  border: 1px solid #e3e6f0;
  color: #4e5567;
}

.btn-secondary:hover:not(:disabled) {
  background: #f5f7fa;
  border-color: #bcc8d9;
  color: #414a61;
  transform: translateY(-1px);
}

/* 危险按钮：保留红色语义 */
.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 10px 24px -10px rgba(239, 68, 68, 0.5);
}

.btn-outline {
  background: transparent;
  border: 1px solid #e3e6f0;
  color: #4e5567;
}

.btn-outline:hover:not(:disabled) {
  background: #f5f7fa;
  border-color: #bcc8d9;
  color: #414a61;
}

.btn-ghost {
  background: transparent;
  color: #8b91a5;
}

.btn-ghost:hover:not(:disabled) {
  background: #f2f4f8;
  color: #4c5670;
}

/* Loading */
.btn-loading {
  position: relative;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  opacity: 0.7;
}

.btn-small .spinner {
  width: 12px;
  height: 12px;
}

.btn-large .spinner {
  width: 20px;
  height: 20px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .btn,
  .spinner {
    transition: none;
    animation: none;
  }

  .btn:hover:not(:disabled) {
    transform: none;
  }
}
</style>
