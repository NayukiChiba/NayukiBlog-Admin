<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import { usePendingChangesStore } from "@/stores/pendingChanges";
import { githubAPI, type RssFeed } from "@/api/github";
import { isDevPreviewMode } from "@/router";
import { DevPreviewBanner } from "@/components/common";

const authStore = useAuthStore();
const pendingChangesStore = usePendingChangesStore();

// 是否为开发预览模式
const isPreviewMode = ref(false);

// 状态
const loading = ref(false);
const saving = ref(false);
const feeds = ref<RssFeed[]>([]);
const dataSha = ref("");
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);

// 编辑模态框
const showModal = ref(false);
const editingFeed = ref<RssFeed | null>(null);
const isNewFeed = ref(false);

// 筛选
const searchQuery = ref("");

// 表单数据
const form = ref<RssFeed>({
  id: 0,
  name: "",
  site: "",
  feedUrl: "",
  status: "active",
});

// 筛选后的订阅源列表
const filteredFeeds = computed(() => {
  return feeds.value.filter((feed) => {
    const query = searchQuery.value.toLowerCase();
    return (
      !query ||
      feed.name.toLowerCase().includes(query) ||
      feed.site.toLowerCase().includes(query) ||
      feed.feedUrl.toLowerCase().includes(query)
    );
  });
});

// 获取订阅源列表
async function fetchFeeds() {
  // 检查是否为开发预览模式
  isPreviewMode.value = isDevPreviewMode();

  // 没有 token 时不尝试获取数据，保持空状态
  if (!authStore.token) {
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    githubAPI.init(authStore.token);
    const result = await githubAPI.getRssFeeds();
    feeds.value = result.feeds;
    dataSha.value = result.sha;
  } catch (err) {
    console.error("Failed to fetch rss feeds:", err);
    error.value = "获取 RSS 订阅列表失败";
    feeds.value = [];
  } finally {
    loading.value = false;
  }
}

// 打开新建模态框
function openNewModal() {
  isNewFeed.value = true;
  editingFeed.value = null;
  form.value = {
    id: Math.max(0, ...feeds.value.map((f) => f.id)) + 1,
    name: "",
    site: "",
    feedUrl: "",
    status: "active",
  };
  showModal.value = true;
}

// 打开编辑模态框
function openEditModal(feed: RssFeed) {
  isNewFeed.value = false;
  editingFeed.value = feed;
  form.value = { ...feed };
  showModal.value = true;
}

// 关闭模态框
function closeModal() {
  showModal.value = false;
  editingFeed.value = null;
}

// 订阅源显示名（名称为空时回退显示站点域名）
function displayName(feed: RssFeed): string {
  if (feed.name) return feed.name;
  try {
    return new URL(feed.site || feed.feedUrl).hostname;
  } catch {
    return feed.site || feed.feedUrl;
  }
}

// 保存订阅源
async function saveFeed() {
  if (!form.value.feedUrl.trim()) {
    error.value = "请输入 Feed 地址";
    return;
  }

  saving.value = true;
  error.value = null;

  try {
    if (isNewFeed.value) {
      feeds.value.unshift({ ...form.value });
    } else {
      const index = feeds.value.findIndex((f) => f.id === form.value.id);
      if (index !== -1) {
        feeds.value[index] = { ...form.value };
      }
    }

    // 添加到待提交变更（不立即保存到 GitHub）
    if (authStore.token && dataSha.value) {
      const description = isNewFeed.value
        ? `📡 新增 RSS 订阅: ${displayName(form.value)}`
        : `📡 更新 RSS 订阅: ${displayName(form.value)}`;

      pendingChangesStore.addChange({
        path: "src/data/rss.json",
        type: "update",
        content: JSON.stringify({ feeds: feeds.value }, null, 2),
        sha: dataSha.value,
        description,
      });
    }

    successMessage.value = isNewFeed.value
      ? "订阅源已添加（待提交）"
      : "订阅源已更新（待提交）";
    setTimeout(() => (successMessage.value = null), 3000);
    closeModal();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "保存失败";
  } finally {
    saving.value = false;
  }
}

// 删除订阅源
async function deleteFeed(feed: RssFeed) {
  if (!confirm(`确定要删除「${displayName(feed)}」吗？`)) return;

  try {
    feeds.value = feeds.value.filter((f) => f.id !== feed.id);

    // 添加到待提交变更（不立即保存到 GitHub）
    if (authStore.token && dataSha.value) {
      pendingChangesStore.addChange({
        path: "src/data/rss.json",
        type: "update",
        content: JSON.stringify({ feeds: feeds.value }, null, 2),
        sha: dataSha.value,
        description: `📡 删除 RSS 订阅: ${displayName(feed)}`,
      });
    }

    successMessage.value = "订阅源已删除（待提交）";
    setTimeout(() => (successMessage.value = null), 3000);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "删除失败";
    fetchFeeds();
  }
}

// 退出开发预览模式 - 由 DevPreviewBanner 组件处理
function handleExitPreview() {
  isPreviewMode.value = false;
}

onMounted(() => {
  fetchFeeds();
});
</script>

<template>
  <div class="rss-list">
    <!-- 开发预览模式/未登录提示 -->
    <DevPreviewBanner
      :is-preview-mode="isPreviewMode"
      :is-logged-in="!!authStore.token"
      @exit-preview="handleExitPreview"
    />

    <!-- 顶部操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <p class="page-description">
          管理 RSS 订阅源，博客构建时会抓取这些源的最新文章展示在 RSS 页面
        </p>
      </div>
      <div class="header-right">
        <button class="btn btn-primary" @click="openNewModal">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          添加订阅
        </button>
      </div>
    </div>

    <!-- 成功提示 -->
    <div v-if="successMessage" class="success-message">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>{{ successMessage }}</span>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>{{ error }}</span>
      <button class="close-btn" @click="error = null">×</button>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar card">
      <div class="filter-item">
        <input
          v-model="searchQuery"
          type="text"
          class="input"
          placeholder="搜索名称或地址..."
        />
      </div>
    </div>

    <!-- 订阅源列表 -->
    <div class="feeds-container">
      <div v-if="loading" class="loading-state">
        <span class="spinner"></span>
        <span>加载中...</span>
      </div>

      <div v-else-if="filteredFeeds.length === 0" class="empty-state">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M4 11a9 9 0 0 1 9 9"></path>
          <path d="M4 4a16 16 0 0 1 16 16"></path>
          <circle cx="5" cy="19" r="1"></circle>
        </svg>
        <p>暂无订阅源</p>
        <button class="btn btn-primary" @click="openNewModal">
          添加第一个订阅
        </button>
      </div>

      <div v-else class="feeds-grid">
        <div v-for="feed in filteredFeeds" :key="feed.id" class="feed-card">
          <div class="feed-main">
            <div class="feed-title-row">
              <span class="feed-name">{{ displayName(feed) }}</span>
              <span
                :class="[
                  'status-badge',
                  feed.status === 'active' ? 'status-active' : 'status-disabled',
                ]"
              >
                {{ feed.status === "active" ? "启用" : "停用" }}
              </span>
            </div>
            <div class="feed-urls">
              <a
                v-if="feed.site"
                :href="feed.site"
                target="_blank"
                rel="noopener noreferrer"
                class="feed-url"
                title="访问站点"
              >
                {{ feed.site }}
              </a>
              <span class="feed-url feed-url-secondary" :title="feed.feedUrl">
                {{ feed.feedUrl }}
              </span>
            </div>
          </div>
          <div class="feed-actions">
            <button class="action-btn" title="编辑" @click="openEditModal(feed)">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                ></path>
                <path
                  d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                ></path>
              </svg>
            </button>
            <button
              class="action-btn action-btn-danger"
              title="删除"
              @click="deleteFeed(feed)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="3 6 5 6 21 6"></polyline>
                <path
                  d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                ></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-bar">
      <span>共 {{ filteredFeeds.length }} 个订阅源</span>
    </div>

    <!-- 编辑模态框 -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ isNewFeed ? "添加订阅" : "编辑订阅" }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <!-- 名称 -->
          <div class="form-group">
            <label class="form-label">名称（可空，留空时显示 feed 标题）</label>
            <input
              v-model="form.name"
              type="text"
              class="input"
              placeholder="自定义备注名"
            />
          </div>

          <!-- 站点地址 -->
          <div class="form-group">
            <label class="form-label">站点地址</label>
            <input
              v-model="form.site"
              type="url"
              class="input"
              placeholder="https://example.com/"
            />
          </div>

          <!-- Feed 地址 -->
          <div class="form-group">
            <label class="form-label">Feed 地址 *</label>
            <input
              v-model="form.feedUrl"
              type="url"
              class="input"
              placeholder="https://example.com/atom.xml"
            />
            <p class="form-hint">支持 RSS 2.0 / Atom / JSON Feed 格式</p>
          </div>

          <!-- 状态 -->
          <div class="form-group">
            <label class="form-label">状态</label>
            <select v-model="form.status" class="input">
              <option value="active">启用</option>
              <option value="disabled">停用</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn btn-secondary"
            @click="closeModal"
            :disabled="saving"
          >
            取消
          </button>
          <button class="btn btn-primary" @click="saveFeed" :disabled="saving">
            <span v-if="saving" class="spinner small"></span>
            {{ saving ? "保存中..." : "保存" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rss-list {
  width: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.page-description {
  color: #64748b;
  margin: 0;
}

/* 消息提示 */
.success-message,
.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.success-message {
  background: #f0fdf4;
  border: 1px solid #86efac;
  color: #16a34a;
}

.error-message {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
}

.close-btn {
  margin-left: auto;
  background: none;
  border: none;
  font-size: 1.25rem;
  color: inherit;
  cursor: pointer;
  padding: 0 0.25rem;
  opacity: 0.6;
}

.close-btn:hover {
  opacity: 1;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.filter-item {
  flex: 1;
  max-width: 600px;
}

/* 订阅源列表 */
.feeds-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.feed-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  transition: all 0.2s ease;
}

.feed-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.feed-main {
  flex: 1;
  min-width: 0;
}

.feed-title-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 0.375rem;
}

.feed-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1e293b;
}

.status-badge {
  font-size: 0.6875rem;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-weight: 500;
}

.status-active {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #86efac;
}

.status-disabled {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.feed-urls {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.feed-url {
  font-size: 0.8125rem;
  color: #2563eb;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feed-url:hover {
  text-decoration: underline;
}

.feed-url-secondary {
  color: #94a3b8;
}

.feed-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: #f1f5f9;
  border-radius: 0.375rem;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.action-btn-danger:hover {
  background: #fef2f2;
  color: #dc2626;
}

/* 状态 */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #64748b;
  gap: 1rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
}

.empty-state svg {
  color: #cbd5e1;
}

.empty-state p {
  margin: 0;
  font-size: 1rem;
}

.stats-bar {
  margin-top: 1.5rem;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: #64748b;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: white;
  border-radius: 1rem;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalIn 0.2s ease-out;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

/* 表单 */
.form-group {
  margin-bottom: 1.25rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
  margin-bottom: 0.5rem;
}

.form-hint {
  margin: 0.375rem 0 0;
  font-size: 0.75rem;
  color: #94a3b8;
}

.input {
  width: 100%;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background: white;
  color: #1e293b;
  outline: none;
  transition: border-color 0.2s ease;
}

.input:focus {
  border-color: #2563eb;
}

/* 按钮 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  border-radius: 0.5rem;
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

.card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e2e8f0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner.small {
  width: 14px;
  height: 14px;
  border-width: 2px;
  border-color: rgba(255, 255, 255, 0.3);
  border-top-color: white;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .feed-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .feed-actions {
    align-self: flex-end;
  }
}
</style>
