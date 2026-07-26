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
const showStatusDropdown = ref(false);

// 筛选
const searchQuery = ref("");

// 表单数据
const form = ref<RssFeed>({
  id: 0,
  name: "",
  category: "AI",
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
  showStatusDropdown.value = false;
  form.value = {
    id: Math.max(0, ...feeds.value.map((f) => f.id)) + 1,
    name: "",
    category: "AI",
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
  showStatusDropdown.value = false;
  form.value = { ...feed };
  showModal.value = true;
}

// 关闭模态框
function closeModal() {
  showModal.value = false;
  editingFeed.value = null;
  showStatusDropdown.value = false;
}

function selectStatus(status: string) {
  form.value.status = status;
  showStatusDropdown.value = false;
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
              <span class="category-badge">{{ feed.category || "未分类" }}</span>
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

          <!-- 分类 -->
          <div class="form-group">
            <label class="form-label">分类</label>
            <input
              v-model="form.category"
              type="text"
              class="input"
              placeholder="输入分类名称，如：AI、技术"
            />
            <p class="form-hint">建议使用一级分类，避免 RSS 分类树过深</p>
          </div>

          <!-- 状态 -->
          <div class="form-group">
            <label class="form-label">状态</label>
            <div class="custom-select">
              <button
                type="button"
                class="custom-select-trigger"
                :class="{ open: showStatusDropdown }"
                @click="showStatusDropdown = !showStatusDropdown"
              >
                <span>{{ form.status === "active" ? "启用" : "停用" }}</span>
                <svg
                  class="custom-select-icon"
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
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <div v-if="showStatusDropdown" class="custom-select-menu">
                <button
                  type="button"
                  class="custom-select-option"
                  :class="{ active: form.status === 'active' }"
                  @click="selectStatus('active')"
                >
                  <span class="option-dot option-dot-active"></span>
                  <span>启用</span>
                </button>
                <button
                  type="button"
                  class="custom-select-option"
                  :class="{ active: form.status === 'disabled' }"
                  @click="selectStatus('disabled')"
                >
                  <span class="option-dot option-dot-disabled"></span>
                  <span>停用</span>
                </button>
              </div>
            </div>
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
  animation: pageIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes pageIn {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.page-description {
  color: #8b91a5;
  margin: 0;
}

/* 消息提示 */
.success-message,
.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.success-message {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #059669;
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
  transition: opacity 0.2s ease;
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
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: white;
  border: 1px solid #e3e6f0;
  border-radius: 14px;
  padding: 1rem 1.25rem;
  box-shadow: 0 1px 2px rgba(23, 25, 35, 0.04);
  overflow: hidden;
  transition:
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.feed-card:hover {
  transform: translateY(-2px);
  border-color: #d8dce6;
  box-shadow: 0 14px 32px -14px rgba(26, 29, 36, 0.14);
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
  color: #14161f;
}

.status-badge {
  font-size: 0.6875rem;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-weight: 500;
}

.status-active {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.35);
}

.status-disabled {
  background: #eef0f8;
  color: #6a7185;
  border: 1px solid #e3e6f0;
}

.category-badge {
  font-size: 0.6875rem;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-weight: 500;
  background: #eaeef4;
  color: #4c5670;
  border: 1px solid #dbe2eb;
}

.feed-urls {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.feed-url {
  font-size: 0.8125rem;
  color: #4c5670;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.feed-url:hover {
  color: #414a61;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.feed-url-secondary {
  color: #8b91a5;
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
  background: #f4f5fa;
  border-radius: 8px;
  color: #6a7185;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.action-btn:hover {
  background: #eaeef4;
  color: #4c5670;
  transform: translateY(-1px);
}

.action-btn-danger:hover {
  background: rgba(239, 68, 68, 0.1);
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
  color: #8b91a5;
  gap: 1rem;
  background: white;
  border: 1px solid #e3e6f0;
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(23, 25, 35, 0.04);
}

.empty-state svg {
  color: #cdd2e0;
}

.empty-state p {
  margin: 0;
  font-size: 1rem;
}

.stats-bar {
  margin-top: 1.5rem;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: #8b91a5;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 17, 28, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 24px 60px -16px rgba(23, 25, 35, 0.3);
  animation: modalIn 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(-8px);
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
  border-bottom: 1px solid #edeff7;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #14161f;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #edeff7;
  background: #f7f8fc;
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
  color: #4e5567;
  margin-bottom: 0.5rem;
}

.form-hint {
  margin: 0.375rem 0 0;
  font-size: 0.75rem;
  color: #8b91a5;
}

.input {
  width: 100%;
  padding: 0.625rem 0.875rem;
  font-size: 0.875rem;
  border: 1px solid #e3e6f0;
  border-radius: 10px;
  background: white;
  color: #14161f;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.input::placeholder {
  color: #8b91a5;
}

.input:focus {
  border-color: #4c5670;
  box-shadow: 0 0 0 3px rgba(76, 86, 112, 0.14);
}

.custom-select {
  position: relative;
}

.custom-select-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  border: 1px solid #e3e6f0;
  border-radius: 10px;
  background: white;
  color: #14161f;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.custom-select-trigger:hover,
.custom-select-trigger.open {
  border-color: #4c5670;
}

.custom-select-trigger:focus-visible {
  outline: none;
  border-color: #4c5670;
  box-shadow: 0 0 0 3px rgba(76, 86, 112, 0.14);
}

.custom-select-icon {
  flex-shrink: 0;
  color: #8b91a5;
  transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.custom-select-trigger.open .custom-select-icon {
  transform: rotate(180deg);
}

.custom-select-menu {
  position: absolute;
  z-index: 20;
  top: calc(100% + 0.375rem);
  left: 0;
  right: 0;
  padding: 0.375rem;
  background: white;
  border: 1px solid #e3e6f0;
  border-radius: 12px;
  box-shadow: 0 12px 28px -8px rgba(23, 25, 35, 0.14);
  animation: menuIn 0.18s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes menuIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.custom-select-option {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #4e5567;
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.custom-select-option:hover,
.custom-select-option.active {
  background: #eaeef4;
  color: #4c5670;
}

.option-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  flex-shrink: 0;
}

.option-dot-active {
  background: #10b981;
}

.option-dot-disabled {
  background: #8b91a5;
}

/* 按钮 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #4c5670;
  color: white;
  box-shadow: 0 6px 18px -8px rgba(76, 86, 112, 0.35);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #414a61;
  box-shadow: 0 12px 28px -12px rgba(26, 29, 36, 0.24);
}

.btn-secondary {
  background: white;
  color: #4e5567;
  border: 1px solid #e3e6f0;
}

.btn-secondary:hover:not(:disabled) {
  border-color: #bcc8d9;
  background: #f5f7fa;
  color: #414a61;
}

.card {
  background: white;
  border: 1px solid #e3e6f0;
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(23, 25, 35, 0.04);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e6e8ee;
  border-top-color: #4c5670;
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

/* 减少动效 */
@media (prefers-reduced-motion: reduce) {
  .rss-list,
  .feed-card,
  .feed-card::before,
  .modal,
  .custom-select-menu,
  .btn,
  .action-btn {
    animation: none;
    transition: none;
  }
}
</style>
