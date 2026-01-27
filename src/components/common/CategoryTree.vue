<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import SvgIcon from './SvgIcon.vue';

const props = defineProps<{
  modelValue: string;
  categories: CategoryNode[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

export interface CategoryNode {
  name: string;
  path: string;
  children?: CategoryNode[];
}

const expandedPaths = ref<Set<string>>(new Set());

// Initialize expanded state based on current value
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    // Expand parent folders for the selected category
    const parts = newValue.split('/');
    let path = '';
    for (let i = 0; i < parts.length - 1; i++) {
      path = path ? `${path}/${parts[i]}` : parts[i];
      expandedPaths.value.add(path);
    }
  }
}, { immediate: true });

function toggleExpand(path: string) {
  if (expandedPaths.value.has(path)) {
    expandedPaths.value.delete(path);
  } else {
    expandedPaths.value.add(path);
  }
}

function isExpanded(path: string): boolean {
  return expandedPaths.value.has(path);
}

function selectCategory(path: string) {
  emit('update:modelValue', path);
}

function hasChildren(node: CategoryNode): boolean {
  return !!(node.children && node.children.length > 0);
}
</script>

<template>
  <div class="category-tree">
    <div
      v-for="node in categories"
      :key="node.path"
      class="tree-node"
    >
      <div
        class="node-content"
        :class="{ 'is-selected': modelValue === node.path }"
        @click="selectCategory(node.path)"
      >
        <button
          v-if="hasChildren(node)"
          class="expand-btn"
          type="button"
          @click.stop="toggleExpand(node.path)"
        >
          <SvgIcon
            :name="isExpanded(node.path) ? 'chevron-down' : 'chevron-right'"
            :size="14"
          />
        </button>
        <span v-else class="expand-placeholder"></span>

        <SvgIcon
          :name="hasChildren(node) ? (isExpanded(node.path) ? 'folder-open' : 'folder') : 'folder'"
          :size="16"
          class="folder-icon"
        />
        <span class="node-name">{{ node.name }}</span>
      </div>

      <div
        v-if="hasChildren(node) && isExpanded(node.path)"
        class="node-children"
      >
        <CategoryTree
          :model-value="modelValue"
          :categories="node.children!"
          @update:model-value="emit('update:modelValue', $event)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.category-tree {
  user-select: none;
}

.tree-node {
  margin-bottom: 2px;
}

.node-content {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.node-content:hover {
  background: #f3f4f6;
}

.node-content.is-selected {
  background: #eef2ff;
  color: #4f46e5;
}

.node-content.is-selected .folder-icon {
  color: #6366f1;
}

.expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  color: #6b7280;
  border-radius: 4px;
  flex-shrink: 0;
}

.expand-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.expand-placeholder {
  width: 18px;
  flex-shrink: 0;
}

.folder-icon {
  color: #9ca3af;
  flex-shrink: 0;
}

.node-name {
  font-size: 14px;
  color: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-children {
  margin-left: 24px;
  padding-left: 8px;
  border-left: 1px dashed #e5e7eb;
}
</style>
