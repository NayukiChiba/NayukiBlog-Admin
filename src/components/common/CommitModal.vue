<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { usePendingChangesStore, type PendingChange } from "@/stores/pendingChanges";
import { githubAPI } from "@/api/github";
import Modal from "./Modal.vue";

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const authStore = useAuthStore();
const pendingChangesStore = usePendingChangesStore();

// 状态
const committing = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

// 提交信息
const commitMessage = ref("");

// 仓库信息
const repoInfo = computed(() => githubAPI.getRepoInfo());

// 变更类型图标和颜色
const changeTypeConfig = {
  create: { icon: "+", color: "#22c55e", label: "新增" },
  update: { icon: "~", color: "#f59e0b", label: "修改" },
  delete: { icon: "-", color: "#ef4444", label: "删除" },
};

// 格式化时间
function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 获取文件名
function getFileName(path: string) {
  return path.split("/").pop() || path;
}

// 移除单个变更
function removeChange(change: PendingChange) {
  pendingChangesStore.removeChange(change.id);
}

// 清空所有变更
function clearAllChanges() {
  if (confirm("确定要丢弃所有未提交的变更吗？")) {
    pendingChangesStore.clearChanges();
    success.value = "已丢弃所有变更";
    setTimeout(() => {
      success.value = null;
    }, 2000);
  }
}

// 提交变更
async function commitChanges() {
  if (!commitMessage.value.trim()) {
    error.value = "请输入提交信息";
    return;
  }

  if (!pendingChangesStore.hasChanges) {
    error.value = "没有待提交的变更";
    return;
  }

  if (!authStore.token) {
    error.value = "请先登录";
    return;
  }

  committing.value = true;
  error.value = null;

  try {
    githubAPI.init(authStore.token);

    // 转换变更格式
    const changes = pendingChangesStore.changes.map((c) => ({
      path: c.path,
      type: c.type,
      content: c.content,
      sha: c.sha,
    }));

    const result = await githubAPI.batchCommit(changes, commitMessage.value.trim());

    if (result.success) {
      success.value = `成功提交 ${changes.length} 个变更`;
      pendingChangesStore.clearChanges();
      commitMessage.value = "";

      // 2秒后关闭
      setTimeout(() => {
        success.value = null;
        emit("close");
      }, 2000);
    } else {
      error.value = result.error || "提交失败";
    }
  } catch (err: any) {
    console.error("Commit failed:", err);
    error.value = err.message || "提交失败";
  } finally {
    committing.value = false;
  }
}

// 关闭模态框
function handleClose() {
  error.value = null;
  success.value = null;
  emit("close");
}

// 打开 GitHub 仓库
function openRepo() {
  const { owner, repo } = repoInfo.value;
  window.open(`https://github.com/${owner}/${repo}`, "_blank");
}

// 监听显示状态，清除消息
watch(
  () => props.show,
  (newShow) => {
    if (newShow) {
      error.value = null;
      success.value = null;
    }
  }
);
</script>

<template>
  <Modal :show="show" title="提交变更" width="650px" @close="handleClose">
    <!-- 仓库信息 -->
    <div class="repo-info">
      <div class="repo-badge">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
          <path d="M9 18c-4.51 2-5-2-7-2"></path>
        </svg>
        <span>{{ repoInfo.owner }}/{{ repoInfo.repo }}</span>
        <span class="branch-badge">{{ repoInfo.branch }}</span>
      </div>
      <button class="icon-btn" @click="openRepo" title="打开仓库">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      </button>
    </div>

    <!-- 错误信息 -->
    <div v-if="error" class="error-message">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>{{ error }}</span>
    </div>

    <!-- 成功信息 -->
    <div v-if="success" class="success-message">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>{{ success }}</span>
    </div>

    <!-- 待提交变更列表 -->
    <div class="changes-section">
      <div class="section-header">
        <h4 class="section-title">
          待提交变更
          <span v-if="pendingChangesStore.hasChanges" class="changes-count">{{ pendingChangesStore.changesCount }}</span>
        </h4>
        <button v-if="pendingChangesStore.hasChanges" class="clear-btn" @click="clearAllChanges">丢弃全部</button>
      </div>

      <!-- 空状态 -->
      <div v-if="!pendingChangesStore.hasChanges" class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <p>没有待提交的变更</p>
        <span class="empty-hint">在页面中进行修改后，变更会显示在这里</span>
      </div>

      <!-- 变更列表 -->
      <div v-else class="changes-list">
        <div v-for="change in pendingChangesStore.sortedChanges" :key="change.id" class="change-item">
          <div class="change-type" :style="{ backgroundColor: changeTypeConfig[change.type].color + '20', color: changeTypeConfig[change.type].color }">
            {{ changeTypeConfig[change.type].icon }}
          </div>
          <div class="change-content">
            <div class="change-file">{{ getFileName(change.path) }}</div>
            <div class="change-meta">
              <span class="change-path">{{ change.path }}</span>
              <span class="change-time">{{ formatTime(change.timestamp) }}</span>
            </div>
            <div class="change-desc">{{ change.description }}</div>
          </div>
          <button class="remove-btn" @click="removeChange(change)" title="丢弃此变更">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 提交信息输入 -->
    <div v-if="pendingChangesStore.hasChanges" class="commit-section">
      <label class="input-label">提交信息</label>
      <textarea v-model="commitMessage" class="commit-input" placeholder="描述本次提交的变更内容..." rows="3" :disabled="committing"></textarea>
    </div>

    <template #footer>
      <button class="btn btn-secondary" @click="handleClose" :disabled="committing">取消</button>
      <button class="btn btn-primary" @click="commitChanges" :disabled="!pendingChangesStore.hasChanges || !commitMessage.trim() || committing">
        <span v-if="committing" class="btn-spinner"></span>
        {{ committing ? "提交中..." : "提交并推送" }}
      </button>
    </template>
  </Modal>
</template>

<style scoped>
/* 仓库信息 */
.repo-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

.repo-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #1e293b;
}

.repo-badge svg {
  color: #64748b;
}

.branch-badge {
  padding: 0.125rem 0.5rem;
  background: #dbeafe;
  color: #2563eb;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 0.375rem;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}

/* 消息提示 */
.error-message,
.success-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.error-message {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
}

.success-message {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #16a34a;
}

/* 变更区域 */
.changes-section {
  margin-bottom: 1rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
  margin: 0;
}

.changes-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 0.375rem;
  background: #2563eb;
  color: white;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.clear-btn {
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  color: #ef4444;
  background: transparent;
  border: 1px solid #fecaca;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: #fef2f2;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  border: 2px dashed #e2e8f0;
}

.empty-state svg {
  color: #94a3b8;
  margin-bottom: 0.75rem;
}

.empty-state p {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #64748b;
}

.empty-hint {
  font-size: 0.8125rem;
  color: #94a3b8;
  margin-top: 0.25rem;
}

/* 变更列表 */
.changes-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 250px;
  overflow-y: auto;
}

.change-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}

.change-type {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 700;
  flex-shrink: 0;
}

.change-content {
  flex: 1;
  min-width: 0;
}

.change-file {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 0.125rem;
}

.change-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #94a3b8;
  margin-bottom: 0.25rem;
}

.change-path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.change-time {
  flex-shrink: 0;
}

.change-desc {
  font-size: 0.8125rem;
  color: #64748b;
}

.remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 0.25rem;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.remove-btn:hover {
  background: #fee2e2;
  color: #ef4444;
}

/* 提交信息输入 */
.commit-section {
  margin-top: 1rem;
}

.input-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
  margin-bottom: 0.5rem;
}

.commit-input {
  width: 100%;
  padding: 0.75rem;
  font-size: 0.875rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s ease;
}

.commit-input:focus {
  outline: none;
  border-color: #2563eb;
}

.commit-input:disabled {
  background: #f8fafc;
  cursor: not-allowed;
}

/* 按钮 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
}

.btn-secondary:hover:not(:disabled) {
  background: #e2e8f0;
}

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
