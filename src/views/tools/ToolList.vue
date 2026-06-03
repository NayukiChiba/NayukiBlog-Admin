<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import { usePendingChangesStore } from "@/stores/pendingChanges";
import { githubAPI, type Tool } from "@/api/github";
import { isDevPreviewMode } from "@/router";
import { DevPreviewBanner } from "@/components/common";

const authStore = useAuthStore();
const pendingChangesStore = usePendingChangesStore();

// 是否为开发预览模式
const isPreviewMode = ref(false);

// 状态
const loading = ref(true);
const saving = ref(false);
const tools = ref<Tool[]>([]);
const dataSha = ref("");
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);

// 模态框
const showModal = ref(false);
const editingTool = ref<Tool | null>(null);
const isNewTool = ref(false);

// 搜索
const searchQuery = ref("");

// 表单
const form = ref({
  id: 0,
  name: "",
  description: "",
  url: "",
  icon: "🔧",
  category: "",
  status: "published",
});

// 图标选项
// iconOptions 已移除 - 用户直接在 JSON 中填写 SVG 代码

// 筛选后的工具列表
const filteredTools = computed(() => {
  return tools.value.filter((tool) => {
    const matchesSearch =
      !searchQuery.value ||
      tool.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.value.toLowerCase());

    return matchesSearch;
  });
});

// 按分类分组
const groupedTools = computed(() => {
  const groups: Record<string, Tool[]> = {};
  filteredTools.value.forEach((tool) => {
    const category = tool.category || "其他";
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(tool);
  });
  return groups;
});

// 获取工具数据
async function fetchTools() {
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
    const result = await githubAPI.getTools();
    tools.value = result.tools;
    dataSha.value = result.sha;
  } catch (err) {
    console.error("Failed to fetch tools:", err);
    error.value = "获取工具列表失败";
    // 出错时保持空列表
    tools.value = [];
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
  isNewTool.value = true;
  editingTool.value = null;
  form.value = {
    id: Math.max(0, ...tools.value.map((t) => t.id)) + 1,
    name: "",
    description: "",
    url: "",
    icon: "",
    category: "",
    status: "published",
  };
  showModal.value = true;
}

// 打开编辑模态框
function openEditModal(tool: Tool) {
  isNewTool.value = false;
  editingTool.value = tool;
  form.value = { ...tool };
  showModal.value = true;
}

// 关闭模态框
function closeModal() {
  showModal.value = false;
  editingTool.value = null;
}

// 保存工具
async function saveTool() {
  if (!form.value.name.trim()) {
    error.value = "请输入工具名称";
    return;
  }

  if (!form.value.url.trim()) {
    error.value = "请输入工具链接";
    return;
  }

  saving.value = true;
  error.value = null;

  try {
    const toolData: Tool = {
      id: form.value.id,
      name: form.value.name.trim(),
      description: form.value.description.trim(),
      url: form.value.url.trim(),
      icon: form.value.icon,
      category: form.value.category,
      status: form.value.status,
    };

    if (isNewTool.value) {
      tools.value.push(toolData);
    } else {
      const index = tools.value.findIndex((t) => t.id === toolData.id);
      if (index !== -1) {
        tools.value[index] = toolData;
      }
    }

    // 添加到待提交变更（不立即保存到 GitHub）
    if (authStore.token) {
      const description = isNewTool.value
        ? `🔧 添加工具: ${toolData.name}`
        : `🔧 更新工具: ${toolData.name}`;
      pendingChangesStore.addChange({
        path: 'src/data/tools.json',
        type: isNewTool.value ? 'create' : 'update',
        content: JSON.stringify({ tools: tools.value }, null, 2),
        sha: dataSha.value,
        description,
      });
    }

    successMessage.value = isNewTool.value
      ? "工具添加成功（待提交）"
      : "工具更新成功（待提交）";
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);

    closeModal();
  } catch (err) {
    console.error("Failed to save tool:", err);
    error.value = "保存失败，请重试";
  } finally {
    saving.value = false;
  }
}

// 删除工具
async function deleteTool(tool: Tool) {
  if (!confirm(`确定要删除「${tool.name}」吗？`)) return;

  try {
    tools.value = tools.value.filter((t) => t.id !== tool.id);

    // 添加到待提交变更（不立即保存到 GitHub）
    if (authStore.token) {
      pendingChangesStore.addChange({
        path: 'src/data/tools.json',
        type: 'update',
        content: JSON.stringify({ tools: tools.value }, null, 2),
        sha: dataSha.value,
        description: `🗑️ 删除工具: ${tool.name}`,
      });
    }

    successMessage.value = "工具删除成功（待提交）";
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  } catch (err) {
    console.error("Failed to delete tool:", err);
    error.value = "删除失败，请重试";
    // 恢复数据
    fetchTools();
  }
}

// 打开工具链接
function openToolUrl(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

onMounted(() => {
  fetchTools();
});
</script>

<template>
  <div class="tool-list">
    <!-- 开发预览模式/未登录提示 -->
    <DevPreviewBanner
      :is-preview-mode="isPreviewMode"
      :is-logged-in="!!authStore.token"
      @exit-preview="handleExitPreview"
    />

    <!-- 顶部操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <p class="page-description">收集和管理你常用的工具和资源</p>
      </div>
      <div class="header-right">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索工具名称或描述..."
        />
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
          添加工具
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

    <!-- 工具内容 -->
    <div class="card">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <span class="spinner"></span>
        <span>加载中...</span>
      </div>

      <!-- 空状态 -->
      <div v-else-if="filteredTools.length === 0" class="empty-state">
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
            d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
          ></path>
        </svg>
        <p>暂无工具</p>
        <button class="btn btn-primary" @click="openNewModal">
          添加第一个工具
        </button>
      </div>

      <!-- 工具列表（按分类分组） -->
      <div v-else class="tools-container">
        <div
          v-for="(categoryTools, category) in groupedTools"
          :key="category"
          class="category-group"
        >
          <h3 class="category-title">
            {{ category }}
            <span class="category-count">{{ categoryTools.length }}</span>
          </h3>

          <div class="tools-grid">
            <div
              v-for="tool in categoryTools"
              :key="tool.id"
              class="tool-card"
              @click="openToolUrl(tool.url)"
            >
              <!-- 图标 (SVG) -->
              <div class="tool-icon" v-html="tool.icon"></div>

              <!-- 信息 -->
              <div class="tool-info">
                <h4 class="tool-name">{{ tool.name }}</h4>
                <p class="tool-desc">{{ tool.description }}</p>
              </div>

              <!-- 操作按钮 -->
              <div class="tool-actions" @click.stop>
                <a
                  :href="tool.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="action-btn"
                  title="打开链接"
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
                      d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                    ></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>
                <button
                  class="action-btn"
                  title="编辑"
                  @click="openEditModal(tool)"
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
                  @click="deleteTool(tool)"
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
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-bar">
      <span
        >共 {{ filteredTools.length }} 个工具，{{
          Object.keys(groupedTools).length
        }}
        个分类</span
      >
    </div>

    <!-- 编辑模态框 -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ isNewTool ? "添加工具" : "编辑工具" }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <!-- 名称 -->
          <div class="form-group">
            <label class="form-label">工具名称 *</label>
            <input
              v-model="form.name"
              type="text"
              class="input"
              placeholder="输入工具名称"
            />
          </div>

          <!-- 链接 -->
          <div class="form-group">
            <label class="form-label">工具链接 *</label>
            <input
              v-model="form.url"
              type="text"
              class="input"
              placeholder="https://example.com"
            />
          </div>

          <!-- 描述 -->
          <div class="form-group">
            <label class="form-label">描述</label>
            <textarea
              v-model="form.description"
              class="input textarea"
              rows="2"
              placeholder="简单描述这个工具..."
            ></textarea>
          </div>

          <!-- 分类 -->
          <div class="form-group">
            <label class="form-label">分类</label>
            <input
              v-model="form.category"
              type="text"
              class="input"
              placeholder="输入分类名称，如：开发工具、AI工具..."
            />
          </div>

          <!-- 图标 -->
          <div class="form-group">
            <label class="form-label">图标 (SVG 代码)</label>
            <textarea
              v-model="form.icon"
              class="input icon-textarea"
              rows="4"
              placeholder="粘贴 SVG 代码，例如：<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>...</svg>"
            ></textarea>
            <div v-if="form.icon" class="icon-preview">
              <span class="preview-label">预览：</span>
              <span class="preview-icon" v-html="form.icon"></span>
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
          <button class="btn btn-primary" @click="saveTool" :disabled="saving">
            <span v-if="saving" class="spinner small"></span>
            {{ saving ? "保存中..." : "保存" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-list {
  width: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.header-right {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.search-input {
  width: 300px;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background: white;
  color: #1e293b;
  outline: none;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  border-color: #2563eb;
}

.page-description {
  color: #64748b;
  margin: 0;
}

/* 提示消息 */
.success-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 0.5rem;
  color: #16a34a;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  color: #dc2626;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

/* 提示消息样式 - 使用 DevPreviewBanner 组件代替 preview-message 和 warning-message */

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

/* 工具容器 */
.tools-container {
  padding: 1rem;
}

.category-group {
  margin-bottom: 2rem;
}

.category-group:last-child {
  margin-bottom: 0;
}

.category-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
}

.category-icon {
  font-size: 1.25rem;
}

.category-count {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.125rem 0.5rem;
  background: #f1f5f9;
  color: #64748b;
  border-radius: 9999px;
}

/* 工具网格 */
.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.tool-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tool-card:hover {
  background: white;
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.tool-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 0.5rem;
  flex-shrink: 0;
  border: 1px solid #e2e8f0;
  padding: 6px;
}

.tool-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.tool-info {
  flex: 1;
  min-width: 0;
}

.tool-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tool-desc {
  font-size: 0.75rem;
  color: #64748b;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}

/* 操作按钮 */
.tool-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.tool-card:hover .tool-actions {
  opacity: 1;
}

.action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: white;
  border-radius: 0.25rem;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.action-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.action-btn-danger:hover {
  background: #fef2f2;
  color: #dc2626;
}

/* 图标选项 */
.icon-textarea {
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  font-size: 0.75rem;
  resize: vertical;
  min-height: 80px;
}

.icon-preview {
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
}

.preview-label {
  font-size: 0.75rem;
  color: #64748b;
}

.preview-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-icon :deep(svg) {
  width: 100%;
  height: 100%;
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

.textarea {
  resize: vertical;
  min-height: 60px;
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
    align-items: stretch;
    gap: 1rem;
  }

  .header-left {
    width: 100%;
  }

  .header-right {
    width: 100%;
    flex-direction: column;
  }

  .search-input {
    width: 100%;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }

  .filter-bar {
    flex-direction: column;
  }

  .filter-item,
  .filter-item:first-child {
    max-width: none;
  }

  .tools-grid {
    grid-template-columns: 1fr;
  }

  .tool-actions {
    opacity: 1;
  }
}

@media (max-width: 640px) {
  .page-description {
    font-size: 0.875rem;
  }

  .modal {
    max-height: 95vh;
  }

  .modal-header {
    padding: 1rem 1.25rem;
  }

  .modal-body {
    padding: 1.25rem;
  }

  .modal-footer {
    padding: 0.875rem 1.25rem;
  }
}
</style>
