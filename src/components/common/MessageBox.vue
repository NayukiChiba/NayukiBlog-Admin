<script setup lang="ts">
defineProps<{
  type: 'success' | 'error' | 'warning' | 'info' | 'preview';
  message?: string;
  closable?: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const typeConfig = {
  success: {
    bgColor: '#dcfce7',
    borderColor: '#86efac',
    textColor: '#166534',
    iconPath: 'M20 6L9 17l-5-5',
  },
  error: {
    bgColor: '#fee2e2',
    borderColor: '#fca5a5',
    textColor: '#991b1b',
    iconPath: 'M6 18L18 6M6 6l12 12',
  },
  warning: {
    bgColor: '#fef3c7',
    borderColor: '#fcd34d',
    textColor: '#92400e',
    iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  },
  info: {
    bgColor: '#dbeafe',
    borderColor: '#93c5fd',
    textColor: '#1e40af',
    iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  preview: {
    bgColor: '#ede9fe',
    borderColor: '#c4b5fd',
    textColor: '#5b21b6',
    iconPath: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  },
};
</script>

<template>
  <div
    class="message-box"
    :style="{
      backgroundColor: typeConfig[type].bgColor,
      borderColor: typeConfig[type].borderColor,
      color: typeConfig[type].textColor,
    }"
  >
    <svg
      class="message-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path :d="typeConfig[type].iconPath" />
    </svg>
    <div class="message-content">
      <slot>{{ message }}</slot>
    </div>
    <button v-if="closable" class="close-btn" @click="emit('close')">×</button>
  </div>
</template>

<style scoped>
.message-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid;
  margin-bottom: 16px;
  font-size: 14px;
}

.message-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.message-content {
  flex: 1;
}

.message-content :deep(a) {
  color: inherit;
  text-decoration: underline;
  font-weight: 500;
}

.message-content :deep(a:hover) {
  opacity: 0.8;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: inherit;
  opacity: 0.6;
  padding: 0;
  line-height: 1;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-btn:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.1);
}
</style>
