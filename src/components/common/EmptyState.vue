<script setup lang="ts">
defineProps<{
  icon?: string;
  title?: string;
  description?: string;
}>();
</script>

<template>
  <div class="empty-state">
    <svg
      v-if="!icon"
      class="empty-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
    <span v-else class="empty-emoji">{{ icon }}</span>
    <p v-if="title" class="empty-title">{{ title }}</p>
    <p v-if="description" class="empty-description">{{ description }}</p>
    <div class="empty-actions">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  color: #6b7280;
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: #d1d5db;
  margin-bottom: 16px;
}

.empty-emoji {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 16px;
  font-weight: 500;
  color: #374151;
  margin: 0 0 8px 0;
}

.empty-description {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 16px 0;
  max-width: 300px;
}

.empty-actions {
  display: flex;
  gap: 12px;
}

.empty-actions:empty {
  display: none;
}
</style>
