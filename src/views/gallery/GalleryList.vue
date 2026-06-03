<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import { usePendingChangesStore } from "@/stores/pendingChanges";
import { githubAPI, type GalleryItem } from "@/api/github";
import { isDevPreviewMode } from "@/router";
import { DevPreviewBanner } from "@/components/common";

const authStore = useAuthStore();
const pendingChangesStore = usePendingChangesStore();

// 是否为开发预览模式
const isPreviewMode = ref(false);

// 状态
const loading = ref(false);
const saving = ref(false);
const gallery = ref<GalleryItem[]>([]);
const dataSha = ref("");
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);

// 模态框
const showModal = ref(false);
const editingItem = ref<GalleryItem | null>(null);
const isNewItem = ref(false);

// 表单
const form = ref({
  id: 0,
  title: "",
  url: "",
  date: new Date().toISOString().split("T")[0],
  tags: [] as string[],
  status: "published",
});

// 标签输入
const tagInput = ref("");

// 状态选项
const statusOptions = [
  { value: "published", label: "公开", color: "green" },
  { value: "private", label: "私密", color: "gray" },
];

// 按日期排序
const sortedGallery = computed(() => {
  return [...gallery.value].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
});

// 获取图库数据
async function fetchGallery() {
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
    const result = await githubAPI.getGallery();
    gallery.value = result.gallery;
    dataSha.value = result.sha;
  } catch (err) {
    console.error("Failed to fetch gallery:", err);
    error.value = "获取图库数据失败";
    // 出错时保持空列表
    gallery.value = [];
  } finally {
    loading.value = false;
  }
}

// 退出开发预览模式 - 由 DevPreviewBanner 组件处理
function handleExitPreview() {
  // 组件会处理跳转，这里只需刷新状态
  isPreviewMode.value = false;
}

// 打开新建模态框
function openNewModal() {
  isNewItem.value = true;
  editingItem.value = null;
  form.value = {
    id: Math.max(0, ...gallery.value.map((i) => i.id)) + 1,
    title: "",
    url: "",
    date: new Date().toISOString().split("T")[0],
    tags: [],
    status: "published",
  };
  tagInput.value = "";
  showModal.value = true;
}

// 打开编辑模态框
function openEditModal(item: GalleryItem) {
  isNewItem.value = false;
  editingItem.value = item;
  form.value = {
    ...item,
    tags: [...item.tags],
  };
  tagInput.value = "";
  showModal.value = true;
}

// 关闭模态框
function closeModal() {
  showModal.value = false;
  editingItem.value = null;
}

// 添加标签
function addTag() {
  const tag = tagInput.value.trim();
  if (tag && !form.value.tags.includes(tag)) {
    form.value.tags.push(tag);
  }
  tagInput.value = "";
}

// 删除标签
function removeTag(tag: string) {
  form.value.tags = form.value.tags.filter((t) => t !== tag);
}

// 标签输入键盘事件
function handleTagKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    addTag();
  }
}

// 保存图片
async function saveItem() {
  if (!form.value.title.trim()) {
    error.value = "请输入图片标题";
    return;
  }

  if (!form.value.url.trim()) {
    error.value = "请输入图片 URL";
    return;
  }

  saving.value = true;
  error.value = null;

  try {
    const itemData: GalleryItem = {
      id: form.value.id,
      title: form.value.title.trim(),
      url: form.value.url.trim(),
      date: form.value.date,
      tags: form.value.tags,
      status: form.value.status,
    };

    if (isNewItem.value) {
      gallery.value.unshift(itemData);
    } else {
      const index = gallery.value.findIndex((i) => i.id === itemData.id);
      if (index !== -1) {
        gallery.value[index] = itemData;
      }
    }

    // 添加到待提交变更（不立即保存到 GitHub）
    if (authStore.token) {
      const description = isNewItem.value
        ? `🖼️ 添加图片: ${itemData.title}`
        : `🖼️ 更新图片: ${itemData.title}`;
      pendingChangesStore.addChange({
        path: 'src/data/gallery.json',
        type: isNewItem.value ? 'create' : 'update',
        content: JSON.stringify({ gallery: gallery.value }, null, 2),
        sha: dataSha.value,
        description,
      });
    }

    successMessage.value = isNewItem.value
      ? "图片添加成功（待提交）"
      : "图片更新成功（待提交）";
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);

    closeModal();
  } catch (err) {
    console.error("Failed to save item:", err);
    error.value = "保存失败，请重试";
  } finally {
    saving.value = false;
  }
}

// 删除图片
async function deleteItem(item: GalleryItem) {
  if (!confirm(`确定要删除「${item.title}」吗？`)) return;

  try {
    gallery.value = gallery.value.filter((i) => i.id !== item.id);

    // 添加到待提交变更（不立即保存到 GitHub）
    if (authStore.token) {
      pendingChangesStore.addChange({
        path: 'src/data/gallery.json',
        type: 'update',
        content: JSON.stringify({ gallery: gallery.value }, null, 2),
        sha: dataSha.value,
        description: `🗑️ 删除图片: ${item.title}`,
      });
    }

    successMessage.value = "图片删除成功（待提交）";
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  } catch (err) {
    console.error("Failed to delete item:", err);
    error.value = "删除失败，请重试";
    // 恢复数据
    fetchGallery();
  }
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

// 图片加载错误处理
function handleImageError(e: Event) {
  const img = e.target as HTMLImageElement;
  img.src = "https://via.placeholder.com/400x300?text=Image+Not+Found";
}

onMounted(() => {
  fetchGallery();
});
</script>

<template>
  <div class="gallery-list">
    <!-- 开发预览模式/未登录提示 -->
    <DevPreviewBanner
      :is-preview-mode="isPreviewMode"
      :is-logged-in="!!authStore.token"
      @exit-preview="handleExitPreview"
    />

    <!-- 顶部操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <p class="page-description">管理你的图片库，支持标签分类</p>
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
          添加图片
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

    <!-- 图库内容 -->
    <div class="card">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <span class="spinner"></span>
        <span>加载中...</span>
      </div>

      <!-- 空状态 -->
      <div v-else-if="sortedGallery.length === 0" class="empty-state">
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
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <p>暂无图片</p>
        <button class="btn btn-primary" @click="openNewModal">
          添加第一张图片
        </button>
      </div>

      <!-- 图片网格 -->
      <div v-else class="gallery-grid">
        <div v-for="item in sortedGallery" :key="item.id" class="gallery-card">
          <!-- 图片 -->
          <div class="gallery-image">
            <img :src="item.url" :alt="item.title" @error="handleImageError" />
            <div class="image-overlay">
              <div class="overlay-actions">
                <a
                  :href="item.url"
                  target="_blank"
                  class="overlay-btn"
                  title="查看原图"
                >
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
                    <path
                      d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                    ></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>
                <button
                  class="overlay-btn"
                  title="编辑"
                  @click="openEditModal(item)"
                >
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
                    <path
                      d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                    ></path>
                    <path
                      d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                    ></path>
                  </svg>
                </button>
                <button
                  class="overlay-btn overlay-btn-danger"
                  title="删除"
                  @click="deleteItem(item)"
                >
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
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path
                      d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                    ></path>
                  </svg>
                </button>
              </div>
            </div>
            <!-- 状态标签 -->
            <span v-if="item.status === 'private'" class="status-badge">
              私密
            </span>
          </div>

          <!-- 图片信息 -->
          <div class="gallery-info">
            <h3 class="gallery-title">{{ item.title }}</h3>
            <p class="gallery-date">{{ formatDate(item.date) }}</p>
            <div class="gallery-tags">
              <span v-for="tag in item.tags.slice(0, 3)" :key="tag" class="tag">
                {{ tag }}
              </span>
              <span v-if="item.tags.length > 3" class="tag tag-more">
                +{{ item.tags.length - 3 }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-bar">
      <span>共 {{ sortedGallery.length }} 张图片</span>
    </div>

    <!-- 编辑模态框 -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ isNewItem ? "添加图片" : "编辑图片" }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <!-- 标题 -->
          <div class="form-group">
            <label class="form-label">图片标题 *</label>
            <input
              v-model="form.title"
              type="text"
              class="input"
              placeholder="输入图片标题"
            />
          </div>

          <!-- URL -->
          <div class="form-group">
            <label class="form-label">图片 URL *</label>
            <input
              v-model="form.url"
              type="text"
              class="input"
              placeholder="https://example.com/image.jpg"
            />
            <div v-if="form.url" class="image-preview">
              <img :src="form.url" alt="预览" @error="handleImageError" />
            </div>
          </div>

          <!-- 日期 -->
          <div class="form-group">
            <label class="form-label">日期</label>
            <input v-model="form.date" type="date" class="input" />
          </div>

          <!-- 状态 -->
          <div class="form-group">
            <label class="form-label">可见性</label>
            <div class="status-options">
              <button
                v-for="opt in statusOptions"
                :key="opt.value"
                :class="[
                  'status-btn',
                  `status-${opt.color}`,
                  { active: form.status === opt.value },
                ]"
                @click="form.status = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- 标签 -->
          <div class="form-group">
            <label class="form-label">标签</label>
            <div class="tags-input-container">
              <div class="tags-list">
                <span v-for="tag in form.tags" :key="tag" class="tag removable">
                  {{ tag }}
                  <button class="tag-remove" @click="removeTag(tag)">×</button>
                </span>
              </div>
              <input
                v-model="tagInput"
                type="text"
                class="input"
                placeholder="输入标签后按回车添加"
                @keydown="handleTagKeydown"
                @blur="addTag"
              />
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
          <button class="btn btn-primary" @click="saveItem" :disabled="saving">
            <span v-if="saving" class="spinner small"></span>
            {{ saving ? "保存中..." : "保存" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gallery-list {
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

/* 提示消息 */
.success-message,
.error-message,
.warning-message,
.preview-message {
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

.warning-message {
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #d97706;
}

.warning-message a {
  color: #b45309;
  font-weight: 500;
  text-decoration: underline;
}

.preview-message {
  background: #f0fdf4;
  border: 1px solid #86efac;
  color: #16a34a;
}

.preview-message a {
  color: #15803d;
  font-weight: 500;
  text-decoration: underline;
}

.exit-preview-btn {
  margin-left: auto;
  padding: 0.25rem 0.75rem;
  background: #16a34a;
  color: white;
  border: none;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.2s;
}

.exit-preview-btn:hover {
  background: #15803d;
}

.close-btn {
  margin-left: auto;
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0 0.25rem;
  color: inherit;
}

.close-btn:hover {
  opacity: 0.7;
}

/* 图片网格 */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  padding: 1rem;
}

.gallery-card {
  background: white;
  border-radius: 0.75rem;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.gallery-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.gallery-image {
  position: relative;
  aspect-ratio: 4/3;
  overflow: hidden;
}

.gallery-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.gallery-card:hover .gallery-image img {
  transform: scale(1.05);
}

.image-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.gallery-card:hover .image-overlay {
  opacity: 1;
}

.overlay-actions {
  display: flex;
  gap: 0.75rem;
}

.overlay-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: none;
  border-radius: 50%;
  color: #1e293b;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.overlay-btn:hover {
  background: #f1f5f9;
  transform: scale(1.1);
}

.overlay-btn-danger:hover {
  background: #fef2f2;
  color: #dc2626;
}

.status-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 0.75rem;
  border-radius: 0.25rem;
}

.gallery-info {
  padding: 1rem;
}

.gallery-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gallery-date {
  font-size: 0.75rem;
  color: #94a3b8;
  margin: 0 0 0.5rem;
}

.gallery-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.tag {
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
  background: #f1f5f9;
  color: #64748b;
  border-radius: 0.25rem;
}

.tag.removable {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: #eff6ff;
  color: #2563eb;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}

.tag-remove {
  background: none;
  border: none;
  color: inherit;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.tag-remove:hover {
  color: #dc2626;
}

.tag-more {
  background: #e2e8f0;
}

/* 状态选项 */
.status-options {
  display: flex;
  gap: 0.5rem;
}

.status-btn {
  flex: 1;
  padding: 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-btn:hover {
  background: #f8fafc;
}

.status-btn.active.status-green {
  background: #f0fdf4;
  border-color: #16a34a;
  color: #16a34a;
}

.status-btn.active.status-gray {
  background: #f8fafc;
  border-color: #64748b;
  color: #64748b;
}

/* 标签输入 */
.tags-input-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

/* 图片预览 */
.image-preview {
  margin-top: 0.5rem;
  border-radius: 0.375rem;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  max-height: 200px;
}

.image-preview img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
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

/* 统计信息 */
.stats-bar {
  margin-top: 1rem;
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
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
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
  margin-bottom: 1rem;
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

.input {
  width: 100%;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
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
  width: 18px;
  height: 18px;
  border: 2px solid rgba(0, 0, 0, 0.1);
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

  .filter-bar {
    flex-direction: column;
  }

  .filter-item,
  .filter-item:first-child {
    max-width: none;
  }

  .gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
    padding: 0.75rem;
  }
}

@media (max-width: 480px) {
  .gallery-grid {
    grid-template-columns: 1fr;
  }
}
</style>
