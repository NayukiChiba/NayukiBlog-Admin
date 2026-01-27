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
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
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
}

.btn-medium {
  padding: 8px 16px;
  font-size: 14px;
}

.btn-large {
  padding: 12px 24px;
  font-size: 16px;
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
.btn-primary {
  background: #6366f1;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #4f46e5;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-outline {
  background: transparent;
  border: 1px solid #d1d5db;
  color: #374151;
}

.btn-outline:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.btn-ghost {
  background: transparent;
  color: #6b7280;
}

.btn-ghost:hover:not(:disabled) {
  background: #f3f4f6;
  color: #374151;
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
</style>
