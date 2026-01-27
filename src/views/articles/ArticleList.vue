<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { githubAPI, type Article } from "@/api/github";
import { isDevPreviewMode } from "@/router";
import { DevPreviewBanner } from "@/components/common";

const router = useRouter();
const authStore = useAuthStore();

// 是否为开发预览模式
const isPreviewMode = ref(false);

// 状态
const loading = ref(false);
const articles = ref<Article[]>([]);
const searchQuery = ref("");
const selectedCategory = ref("");
const selectedStatus = ref("");
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);

// 筛选后的文章列表
const filteredArticles = computed(() => {
  return articles.value.filter((article) => {
    const matchesSearch =
      !searchQuery.value ||
      article.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      article.description
        .toLowerCase()
        .includes(searchQuery.value.toLowerCase());

    const matchesCategory =
      !selectedCategory.value || article.category === selectedCategory.value;
    const matchesStatus =
      !selectedStatus.value || article.status === selectedStatus.value;

    return matchesSearch && matchesCategory && matchesStatus;
  });
});

// 获取所有分类
const categories = computed(() => {
  const cats = new Set(articles.value.map((a) => a.category).filter(Boolean));
  return Array.from(cats);
});

// 获取文章列表
async function fetchArticles() {
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
    const result = await githubAPI.getArticles();
    articles.value = result;
  } catch (err) {
    console.error("Failed to fetch articles:", err);
    error.value = "获取文章列表失败";
    // 出错时保持空列表
    articles.value = [];
  } finally {
    loading.value = false;
  }
}

// 编辑文章
function editArticle(slug: string) {
  router.push(`/articles/${slug}`);
}

// 删除文章
async function deleteArticle(article: Article) {
  if (!confirm(`确定要删除文章「${article.title}」吗？此操作不可恢复。`))
    return;

  try {
    if (authStore.token && article.sha) {
      githubAPI.init(authStore.token);
      await githubAPI.deleteArticle(article.slug, article.sha);
      successMessage.value = `文章「${article.title}」已删除`;
    }
    // 从列表中移除
    articles.value = articles.value.filter((a) => a.slug !== article.slug);

    // 3秒后清除成功消息
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  } catch (err) {
    console.error("Failed to delete article:", err);
    error.value = "删除失败，请重试";
    // 3秒后清除错误消息
    setTimeout(() => {
      error.value = null;
    }, 3000);
  }
}

// 刷新列表
function refreshList() {
  fetchArticles();
}

// 退出开发预览模式 - 由 DevPreviewBanner 组件处理
function handleExitPreview() {
  // 组件会处理跳转，这里只需刷新状态
  isPreviewMode.value = false;
}

// 格式化日期
function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// 获取状态标签样式
function getStatusClass(status: string) {
  switch (status) {
    case "public":
      return "badge-success";
    case "draft":
      return "badge-warning";
    case "private":
      return "badge-danger";
    default:
      return "badge-primary";
  }
}

// 获取状态文字
function getStatusText(status: string) {
  switch (status) {
    case "public":
      return "已发布";
    case "draft":
      return "草稿";
    case "private":
      return "私密";
    default:
      return status;
  }
}

onMounted(() => {
  fetchArticles();
});
</script>

<template>
  <div class="article-list">
    <!-- 开发预览模式/未登录提示 -->
    <DevPreviewBanner
      :is-preview-mode="isPreviewMode"
      :is-logged-in="!!authStore.token"
      @exit-preview="handleExitPreview"
    />

    <!-- 顶部操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <p class="page-description">管理你的博客文章，支持 Markdown 格式</p>
      </div>
      <div class="header-right">
        <button
          class="btn btn-secondary"
          @click="refreshList"
          :disabled="loading"
        >
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
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path
              d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
            ></path>
          </svg>
          刷新
        </button>
        <router-link to="/articles/new" class="btn btn-primary">
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
          新建文章
        </router-link>
      </div>
    </div>

    <!-- 成功消息 -->
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
      <button class="close-btn" @click="successMessage = null">×</button>
    </div>

    <!-- 错误消息 -->
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
      <button @click="error = null" class="close-btn">×</button>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar card">
      <div class="filter-item">
        <input
          v-model="searchQuery"
          type="text"
          class="input"
          placeholder="搜索文章标题或描述..."
        />
      </div>
      <div class="filter-item">
        <select v-model="selectedCategory" class="input">
          <option value="">所有分类</option>
          <option v-for="cat in categories" :key="cat" :value="cat">
            {{ cat }}
          </option>
        </select>
      </div>
      <div class="filter-item">
        <select v-model="selectedStatus" class="input">
          <option value="">所有状态</option>
          <option value="public">已发布</option>
          <option value="draft">草稿</option>
          <option value="private">私密</option>
        </select>
      </div>
    </div>

    <!-- 文章列表 -->
    <div class="card">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <span class="spinner"></span>
        <span>加载中...</span>
      </div>

      <!-- 空状态 -->
      <div v-else-if="filteredArticles.length === 0" class="empty-state">
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
          <path
            d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"
          ></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <p>暂无文章</p>
        <router-link to="/articles/new" class="btn btn-primary"
          >写第一篇文章</router-link
        >
      </div>

      <!-- 文章表格 -->
      <table v-else class="table">
        <thead>
          <tr>
            <th>标题</th>
            <th>分类</th>
            <th>状态</th>
            <th>发布日期</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="article in filteredArticles" :key="article.slug">
            <td>
              <div class="article-info">
                <span class="article-title">{{ article.title }}</span>
                <span class="article-desc">{{ article.description }}</span>
                <div class="article-tags">
                  <span
                    v-for="tag in article.tags.slice(0, 3)"
                    :key="tag"
                    class="tag"
                  >
                    {{ tag }}
                  </span>
                  <span v-if="article.tags.length > 3" class="tag tag-more">
                    +{{ article.tags.length - 3 }}
                  </span>
                </div>
              </div>
            </td>
            <td>
              <span class="category">{{ article.category }}</span>
            </td>
            <td>
              <span :class="['badge', getStatusClass(article.status)]">
                {{ getStatusText(article.status) }}
              </span>
            </td>
            <td>
              <span class="date">{{ formatDate(article.date) }}</span>
            </td>
            <td>
              <div class="actions">
                <button
                  class="action-btn"
                  title="编辑"
                  @click="editArticle(article.slug)"
                >
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
                  @click="deleteArticle(article)"
                  :disabled="!authStore.token"
                >
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
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path
                      d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                    ></path>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 统计信息 -->
    <div class="stats-bar">
      <span>共 {{ filteredArticles.length }} 篇文章</span>
      <span
        v-if="filteredArticles.length !== articles.length"
        class="stats-filtered"
      >
        (已筛选，共 {{ articles.length }} 篇)
      </span>
    </div>
  </div>
</template>

<style scoped>
.article-list {
  max-width: 1200px;
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

.header-right {
  display: flex;
  gap: 0.75rem;
}

/* 消息提示 */
/* 提示消息样式 - 使用 DevPreviewBanner 组件代替 preview-message 和 warning-message */

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
  border: 1px solid #bbf7d0;
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
  cursor: pointer;
  opacity: 0.5;
  line-height: 1;
}

.close-btn:hover {
  opacity: 1;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  margin-bottom: 1rem;
}

.filter-item {
  flex: 1;
  max-width: 300px;
}

.filter-item:first-child {
  flex: 2;
  max-width: 400px;
}

/* 卡片 */
.card {
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

/* 表格样式 */
.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #f1f5f9;
}

.table th {
  background: #f8fafc;
  font-weight: 500;
  font-size: 0.875rem;
  color: #64748b;
}

.table tbody tr:hover {
  background: #f8fafc;
}

.table tbody tr:last-child td {
  border-bottom: none;
}

.article-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.article-title {
  font-weight: 500;
  color: #1e293b;
}

.article-desc {
  font-size: 0.75rem;
  color: #64748b;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-tags {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.25rem;
}

.tag {
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
  background: #f1f5f9;
  color: #64748b;
  border-radius: 0.25rem;
}

.tag-more {
  background: #e2e8f0;
}

.category {
  font-size: 0.875rem;
  color: #475569;
}

.date {
  font-size: 0.875rem;
  color: #64748b;
}

/* 状态徽章 */
.badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.badge-success {
  background: #dcfce7;
  color: #16a34a;
}

.badge-warning {
  background: #fef3c7;
  color: #d97706;
}

.badge-danger {
  background: #fee2e2;
  color: #dc2626;
}

.badge-primary {
  background: #dbeafe;
  color: #2563eb;
}

/* 操作按钮 */
.actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  width: 32px;
  height: 32px;
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

.action-btn:hover:not(:disabled) {
  background: #e2e8f0;
  color: #1e293b;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn-danger:hover:not(:disabled) {
  background: #fef2f2;
  color: #dc2626;
}

/* 按钮样式 */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
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

/* 输入框 */
.input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: #2563eb;
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
}

.empty-state svg {
  color: #cbd5e1;
}

.empty-state p {
  margin: 0;
  font-size: 1rem;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e2e8f0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 统计信息 */
.stats-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: #64748b;
}

.stats-filtered {
  color: #94a3b8;
}

/* 响应式 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .header-right {
    width: 100%;
  }

  .header-right .btn {
    flex: 1;
    justify-content: center;
  }

  .filter-bar {
    flex-direction: column;
  }

  .filter-item {
    max-width: none;
  }

  .filter-item:first-child {
    max-width: none;
  }

  .table th:nth-child(2),
  .table td:nth-child(2),
  .table th:nth-child(4),
  .table td:nth-child(4) {
    display: none;
  }
}
</style>
