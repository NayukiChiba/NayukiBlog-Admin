<script setup lang="ts">
import { ref, computed, watch } from "vue";
import Modal from "./Modal.vue";
import SvgIcon from "./SvgIcon.vue";
import CategoryTree, { type CategoryNode } from "./CategoryTree.vue";

const props = defineProps<{
  show: boolean;
  modelValue: string;
  categories: CategoryNode[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  close: [];
  confirm: [value: string];
  createFolder: [parentPath: string, folderName: string];
}>();

// 当前选中的文件夹路径
const selectedPath = ref(props.modelValue);

// 创建文件夹相关状态
const isCreatingFolder = ref(false);
const newFolderName = ref("");
const parentFolderPath = ref("");

// 监听 props.modelValue 变化
watch(
  () => props.modelValue,
  (newValue) => {
    selectedPath.value = newValue;
  }
);

// 监听 show 变化，重置状态
watch(
  () => props.show,
  (newShow) => {
    if (newShow) {
      selectedPath.value = props.modelValue;
      isCreatingFolder.value = false;
      newFolderName.value = "";
      parentFolderPath.value = "";
    }
  }
);

// 获取所有可用的父文件夹选项（扁平化）
const flattenedFolders = computed(() => {
  const result: { path: string; name: string; level: number }[] = [];

  function flatten(nodes: CategoryNode[], level: number = 0) {
    for (const node of nodes) {
      result.push({
        path: node.path,
        name: node.name,
        level,
      });
      if (node.children) {
        flatten(node.children, level + 1);
      }
    }
  }

  flatten(props.categories);
  return result;
});

// 新文件夹的完整路径预览
const newFolderPreviewPath = computed(() => {
  if (!newFolderName.value.trim()) {
    return parentFolderPath.value || "(请输入文件夹名称)";
  }
  if (parentFolderPath.value) {
    return `${parentFolderPath.value}/${newFolderName.value.trim()}`;
  }
  return newFolderName.value.trim();
});

// 选择文件夹
function handleSelect(path: string) {
  selectedPath.value = path;
}

// 确认选择
function handleConfirm() {
  emit("update:modelValue", selectedPath.value);
  emit("confirm", selectedPath.value);
  emit("close");
}

// 取消
function handleClose() {
  emit("close");
}

// 切换到创建文件夹模式
function showCreateFolder() {
  isCreatingFolder.value = true;
  // 默认选择当前选中的文件夹作为父文件夹
  parentFolderPath.value = selectedPath.value;
  newFolderName.value = "";
}

// 返回选择模式
function backToSelect() {
  isCreatingFolder.value = false;
  newFolderName.value = "";
  parentFolderPath.value = "";
}

// 创建文件夹
function handleCreateFolder() {
  const folderName = newFolderName.value.trim();
  if (!folderName) return;

  emit("createFolder", parentFolderPath.value, folderName);

  // 选中新创建的文件夹
  const newPath = parentFolderPath.value
    ? `${parentFolderPath.value}/${folderName}`
    : folderName;
  selectedPath.value = newPath;

  // 返回选择模式
  backToSelect();
}

// 获取显示名称
function getCategoryDisplayName(path: string): string {
  return path.split("/").pop() || path;
}
</script>

<template>
  <Modal :show="show" title="选择文件夹" width="500px" @close="handleClose">
    <!-- 选择模式 -->
    <div v-if="!isCreatingFolder" class="folder-picker">
      <div class="current-selection">
        <span class="selection-label">当前选择:</span>
        <span class="selection-path">
          <SvgIcon name="folder" :size="16" />
          {{ getCategoryDisplayName(selectedPath) }}
        </span>
      </div>

      <div class="folder-tree-container">
        <CategoryTree
          :model-value="selectedPath"
          :categories="categories"
          @update:model-value="handleSelect"
        />
      </div>

      <div class="path-preview">
        <span class="preview-label">完整路径:</span>
        <code class="preview-path">{{ selectedPath }}</code>
      </div>

      <button type="button" class="create-folder-btn" @click="showCreateFolder">
        <SvgIcon name="plus" :size="16" />
        创建新文件夹
      </button>
    </div>

    <!-- 创建文件夹模式 -->
    <div v-else class="create-folder">
      <button type="button" class="back-btn" @click="backToSelect">
        <SvgIcon name="chevron-left" :size="16" />
        返回选择
      </button>

      <div class="form-field">
        <label class="field-label">父文件夹</label>
        <select v-model="parentFolderPath" class="field-select">
          <option value="">(根目录)</option>
          <option
            v-for="folder in flattenedFolders"
            :key="folder.path"
            :value="folder.path"
          >
            {{ "　".repeat(folder.level) }}{{ folder.name }}
          </option>
        </select>
      </div>

      <div class="form-field">
        <label class="field-label">文件夹名称</label>
        <input
          v-model="newFolderName"
          type="text"
          class="field-input"
          placeholder="请输入文件夹名称"
          @keyup.enter="handleCreateFolder"
        />
      </div>

      <div class="path-preview">
        <span class="preview-label">预览路径:</span>
        <code class="preview-path">{{ newFolderPreviewPath }}</code>
      </div>
    </div>

    <template #footer>
      <button type="button" class="btn btn-secondary" @click="handleClose">
        取消
      </button>
      <button
        v-if="!isCreatingFolder"
        type="button"
        class="btn btn-primary"
        @click="handleConfirm"
      >
        确定
      </button>
      <button
        v-else
        type="button"
        class="btn btn-primary"
        :disabled="!newFolderName.trim()"
        @click="handleCreateFolder"
      >
        创建文件夹
      </button>
    </template>
  </Modal>
</template>

<style scoped>
.folder-picker {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.current-selection {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #f0fdf4;
  border-radius: 8px;
  border: 1px solid #bbf7d0;
}

.selection-label {
  font-size: 14px;
  color: #6b7280;
}

.selection-path {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #16a34a;
}

.folder-tree-container {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #fafafa;
}

.path-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.preview-label {
  font-size: 13px;
  color: #6b7280;
  flex-shrink: 0;
}

.preview-path {
  font-size: 13px;
  color: #4f46e5;
  font-family: "SF Mono", Monaco, "Courier New", monospace;
  background: #eef2ff;
  padding: 2px 8px;
  border-radius: 4px;
  word-break: break-all;
}

.create-folder-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  background: none;
  color: #6b7280;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.create-folder-btn:hover {
  border-color: #6366f1;
  color: #6366f1;
  background: #eef2ff;
}

/* 创建文件夹模式 */
.create-folder {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border: none;
  background: none;
  color: #6b7280;
  font-size: 14px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
  align-self: flex-start;
}

.back-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.field-select,
.field-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #1f2937;
  background: white;
  transition: all 0.2s;
}

.field-select:focus,
.field-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.field-input::placeholder {
  color: #9ca3af;
}

/* 按钮样式 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

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
</style>
