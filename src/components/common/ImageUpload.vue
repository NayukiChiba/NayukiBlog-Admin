<script setup lang="ts">
import { ref, computed } from 'vue';
import SvgIcon from './SvgIcon.vue';

const props = withDefaults(defineProps<{
  modelValue: string[];
  maxImages?: number;
  placeholder?: string;
}>(), {
  maxImages: 2,
  placeholder: '输入图片URL或拖拽图片到此处',
});

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

const urlInput = ref('');
const isDragging = ref(false);
const error = ref<string | null>(null);

const canAddMore = computed(() => props.modelValue.length < props.maxImages);
const remainingSlots = computed(() => props.maxImages - props.modelValue.length);

function addImageUrl() {
  if (!urlInput.value.trim()) return;

  const url = urlInput.value.trim();

  // Basic URL validation
  if (!isValidUrl(url)) {
    error.value = '请输入有效的图片URL';
    return;
  }

  if (props.modelValue.length >= props.maxImages) {
    error.value = `最多只能添加${props.maxImages}张图片`;
    return;
  }

  if (props.modelValue.includes(url)) {
    error.value = '该图片已添加';
    return;
  }

  emit('update:modelValue', [...props.modelValue, url]);
  urlInput.value = '';
  error.value = null;
}

function removeImage(index: number) {
  const newImages = [...props.modelValue];
  newImages.splice(index, 1);
  emit('update:modelValue', newImages);
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url) ||
           url.includes('imgur') ||
           url.includes('unsplash') ||
           url.includes('cloudinary') ||
           url.startsWith('data:image/');
  } catch {
    return false;
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    addImageUrl();
  }
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  isDragging.value = true;
}

function handleDragLeave() {
  isDragging.value = false;
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  isDragging.value = false;

  const text = e.dataTransfer?.getData('text/plain');
  if (text && isValidUrl(text)) {
    if (props.modelValue.length < props.maxImages && !props.modelValue.includes(text)) {
      emit('update:modelValue', [...props.modelValue, text]);
    }
  }
}

function clearError() {
  error.value = null;
}
</script>

<template>
  <div class="image-upload">
    <!-- Image previews -->
    <div v-if="modelValue.length > 0" class="image-preview-grid">
      <div
        v-for="(url, index) in modelValue"
        :key="url"
        class="image-preview-item"
      >
        <img :src="url" :alt="`图片 ${index + 1}`" />
        <button
          type="button"
          class="remove-btn"
          @click="removeImage(index)"
          title="删除图片"
        >
          <SvgIcon name="x" :size="14" />
        </button>
      </div>
    </div>

    <!-- Add image area -->
    <div
      v-if="canAddMore"
      class="add-image-area"
      :class="{ 'is-dragging': isDragging }"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <div class="input-row">
        <input
          v-model="urlInput"
          type="text"
          class="url-input"
          :placeholder="placeholder"
          @keydown="handleKeydown"
          @focus="clearError"
        />
        <button
          type="button"
          class="add-btn"
          :disabled="!urlInput.trim()"
          @click="addImageUrl"
        >
          <SvgIcon name="plus" :size="16" />
        </button>
      </div>

      <p class="hint">
        还可以添加 {{ remainingSlots }} 张图片
      </p>
    </div>

    <!-- Error message -->
    <p v-if="error" class="error-message">{{ error }}</p>
  </div>
</template>

<style scoped>
.image-upload {
  width: 100%;
}

.image-preview-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

.image-preview-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  background: #f3f4f6;
}

.image-preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.image-preview-item:hover .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  background: rgba(239, 68, 68, 0.9);
}

.add-image-area {
  border: 2px dashed #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
}

.add-image-area.is-dragging {
  border-color: #6366f1;
  background: #eef2ff;
}

.input-row {
  display: flex;
  gap: 8px;
}

.url-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.url-input:focus {
  border-color: #6366f1;
}

.url-input::placeholder {
  color: #9ca3af;
}

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.add-btn:hover:not(:disabled) {
  background: #4f46e5;
}

.add-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.hint {
  font-size: 12px;
  color: #9ca3af;
  margin: 8px 0 0 0;
  text-align: center;
}

.error-message {
  font-size: 12px;
  color: #ef4444;
  margin: 8px 0 0 0;
}

@media (max-width: 480px) {
  .image-preview-grid {
    grid-template-columns: 1fr;
  }
}
</style>
