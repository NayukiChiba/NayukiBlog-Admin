import { defineStore } from "pinia";
import { ref, computed } from "vue";

// 变更类型
export type ChangeType = "create" | "update" | "delete";

// 变更项
export interface PendingChange {
  id: string; // 唯一标识
  path: string; // 文件路径
  type: ChangeType; // 变更类型
  content?: string; // 文件内容（删除时为空）
  sha?: string; // 原文件 SHA（更新/删除时需要）
  description: string; // 变更描述
  timestamp: number; // 变更时间戳
}

export const usePendingChangesStore = defineStore("pendingChanges", () => {
  // 待提交的变更列表
  const changes = ref<PendingChange[]>([]);

  // 是否有待提交的变更
  const hasChanges = computed(() => changes.value.length > 0);

  // 变更数量
  const changesCount = computed(() => changes.value.length);

  // 添加变更
  function addChange(change: Omit<PendingChange, "id" | "timestamp">) {
    // 检查是否已存在相同路径的变更
    const existingIndex = changes.value.findIndex(
      (c) => c.path === change.path
    );

    const newChange: PendingChange = {
      ...change,
      id: `${change.path}-${Date.now()}`,
      timestamp: Date.now(),
    };

    if (existingIndex !== -1) {
      // 更新现有变更
      const existing = changes.value[existingIndex];

      // 如果原来是创建，现在是删除，则直接移除
      if (existing.type === "create" && change.type === "delete") {
        changes.value.splice(existingIndex, 1);
        return;
      }

      // 如果原来是创建，现在是更新，保持为创建
      if (existing.type === "create" && change.type === "update") {
        newChange.type = "create";
      }

      changes.value[existingIndex] = newChange;
    } else {
      changes.value.push(newChange);
    }
  }

  // 移除变更
  function removeChange(id: string) {
    const index = changes.value.findIndex((c) => c.id === id);
    if (index !== -1) {
      changes.value.splice(index, 1);
    }
  }

  // 移除指定路径的变更
  function removeChangeByPath(path: string) {
    const index = changes.value.findIndex((c) => c.path === path);
    if (index !== -1) {
      changes.value.splice(index, 1);
    }
  }

  // 清空所有变更
  function clearChanges() {
    changes.value = [];
  }

  // 获取变更列表（按时间排序）
  const sortedChanges = computed(() => {
    return [...changes.value].sort((a, b) => b.timestamp - a.timestamp);
  });

  // 按类型分组的变更
  const groupedChanges = computed(() => {
    const groups = {
      create: [] as PendingChange[],
      update: [] as PendingChange[],
      delete: [] as PendingChange[],
    };

    for (const change of changes.value) {
      groups[change.type].push(change);
    }

    return groups;
  });

  return {
    changes,
    hasChanges,
    changesCount,
    sortedChanges,
    groupedChanges,
    addChange,
    removeChange,
    removeChangeByPath,
    clearChanges,
  };
});
