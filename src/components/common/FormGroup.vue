<script setup lang="ts">
defineProps<{
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}>();
</script>

<template>
  <div class="form-group" :class="{ 'has-error': error }">
    <label v-if="label" class="form-label">
      {{ label }}
      <span v-if="required" class="required">*</span>
    </label>
    <slot></slot>
    <p v-if="hint && !error" class="form-hint">{{ hint }}</p>
    <p v-if="error" class="form-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.form-group {
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.required {
  color: #ef4444;
  margin-left: 2px;
}

.form-hint {
  font-size: 12px;
  color: #6b7280;
  margin: 4px 0 0 0;
}

.form-error {
  font-size: 12px;
  color: #ef4444;
  margin: 4px 0 0 0;
}

.has-error :deep(.input),
.has-error :deep(input),
.has-error :deep(textarea),
.has-error :deep(select) {
  border-color: #ef4444;
}

.has-error :deep(.input:focus),
.has-error :deep(input:focus),
.has-error :deep(textarea:focus),
.has-error :deep(select:focus) {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}
</style>
