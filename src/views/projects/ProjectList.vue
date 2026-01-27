<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import { githubAPI, type Project } from "@/api/github";
import { isDevPreviewMode } from "@/router";
import { DevPreviewBanner } from "@/components/common";

const authStore = useAuthStore();

// 是否为开发预览模式
const isPreviewMode = ref(false);

// 状态
const loading = ref(false);
const saving = ref(false);
const projects = ref<Project[]>([]);
const dataSha = ref("");
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);

// 编辑模态框
const showModal = ref(false);
const editingProject = ref<Project | null>(null);
const isNewProject = ref(false);

// 筛选
const searchQuery = ref("");
const selectedStatus = ref("");

// 表单数据
const form = ref<Project>({
  id: 0,
  name: "",
  description: "",
  link: "",
  techStack: [],
  status: "in-progress",
  visibility: "published",
});

// 技术栈输入
const techInput = ref("");

// 状态选项
const statusOptions = [
  { value: "completed", label: "已完成", color: "green" },
  { value: "in-progress", label: "进行中", color: "blue" },
  { value: "planned", label: "计划中", color: "gray" },
];

// 筛选后的项目列表
const filteredProjects = computed(() => {
  return projects.value.filter((project) => {
    const matchesSearch =
      !searchQuery.value ||
      project.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      project.description
        .toLowerCase()
        .includes(searchQuery.value.toLowerCase());

    const matchesStatus =
      !selectedStatus.value || project.status === selectedStatus.value;

    return matchesSearch && matchesStatus;
  });
});

// 获取项目列表
async function fetchProjects() {
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
    const result = await githubAPI.getProjects();
    projects.value = result.projects;
    dataSha.value = result.sha;
  } catch (err) {
    console.error("Failed to fetch projects:", err);
    error.value = "获取项目列表失败";
    // 出错时保持空列表
    projects.value = [];
  } finally {
    loading.value = false;
  }
}

// 打开新建模态框
function openNewModal() {
  isNewProject.value = true;
  editingProject.value = null;
  form.value = {
    id: Math.max(0, ...projects.value.map((p) => p.id)) + 1,
    name: "",
    description: "",
    link: "",
    techStack: [],
    status: "in-progress",
    visibility: "published",
  };
  showModal.value = true;
}

// 打开编辑模态框
function openEditModal(project: Project) {
  isNewProject.value = false;
  editingProject.value = project;
  form.value = { ...project, techStack: [...project.techStack] };
  showModal.value = true;
}

// 关闭模态框
function closeModal() {
  showModal.value = false;
  editingProject.value = null;
}

// 添加技术栈
function addTech() {
  const tech = techInput.value.trim();
  if (tech && !form.value.techStack.includes(tech)) {
    form.value.techStack.push(tech);
  }
  techInput.value = "";
}

// 删除技术栈
function removeTech(tech: string) {
  form.value.techStack = form.value.techStack.filter((t) => t !== tech);
}

// 技术栈输入键盘事件
function handleTechKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    addTech();
  }
}

// 退出开发预览模式 - 由 DevPreviewBanner 组件处理
function handleExitPreview() {
  // 组件会处理跳转，这里只需刷新状态
  isPreviewMode.value = false;
}

// 保存项目
async function saveProject() {
  if (!form.value.name.trim()) {
    error.value = "请输入项目名称";
    return;
  }

  saving.value = true;
  error.value = null;

  try {
    if (isNewProject.value) {
      projects.value.unshift({ ...form.value });
    } else {
      const index = projects.value.findIndex((p) => p.id === form.value.id);
      if (index !== -1) {
        projects.value[index] = { ...form.value };
      }
    }

    // 保存到 GitHub
    if (authStore.token && dataSha.value) {
      const message = isNewProject.value
        ? `📁 新建项目: ${form.value.name}`
        : `📁 更新项目: ${form.value.name}`;
      dataSha.value = await githubAPI.saveProjects(
        projects.value,
        dataSha.value,
        message,
      );
    }

    successMessage.value = isNewProject.value ? "项目已创建" : "项目已更新";
    setTimeout(() => (successMessage.value = null), 3000);
    closeModal();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "保存失败";
  } finally {
    saving.value = false;
  }
}

// 删除项目
async function deleteProject(project: Project) {
  if (!confirm(`确定要删除项目「${project.name}」吗？`)) return;

  try {
    projects.value = projects.value.filter((p) => p.id !== project.id);

    if (authStore.token && dataSha.value) {
      dataSha.value = await githubAPI.saveProjects(
        projects.value,
        dataSha.value,
        `📁 删除项目: ${project.name}`,
      );
    }

    successMessage.value = "项目已删除";
    setTimeout(() => (successMessage.value = null), 3000);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "删除失败";
    fetchProjects();
  }
}

// 获取状态样式
function getStatusClass(status: string) {
  switch (status) {
    case "completed":
      return "badge-success";
    case "in-progress":
      return "badge-primary";
    case "planned":
      return "badge-gray";
    default:
      return "badge-gray";
  }
}

// 获取状态文字
function getStatusText(status: string) {
  switch (status) {
    case "completed":
      return "已完成";
    case "in-progress":
      return "进行中";
    case "planned":
      return "计划中";
    default:
      return status;
  }
}

onMounted(() => {
  fetchProjects();
});
</script>

<template>
  <div class="project-list">
    <!-- 顶部操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <p class="page-description">管理你的开源项目和作品集</p>
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
          添加项目
        </button>
      </div>
    </div>

    <!-- 开发预览模式/未登录提示 -->
    <DevPreviewBanner
      :is-preview-mode="isPreviewMode"
      :is-logged-in="!!authStore.token"
      @exit-preview="handleExitPreview"
    />

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
          placeholder="搜索项目名称或描述..."
        />
      </div>
      <div class="filter-item">
        <select v-model="selectedStatus" class="input">
          <option value="">所有状态</option>
          <option
            v-for="opt in statusOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- 项目列表 -->
    <div class="projects-container">
      <div v-if="loading" class="loading-state">
        <span class="spinner"></span>
        <span>加载中...</span>
      </div>

      <div v-else-if="filteredProjects.length === 0" class="empty-state">
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
            d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
          ></path>
        </svg>
        <p>暂无项目</p>
        <button class="btn btn-primary" @click="openNewModal">
          添加第一个项目
        </button>
      </div>

      <div v-else class="projects-grid">
        <div
          v-for="project in filteredProjects"
          :key="project.id"
          class="project-card"
        >
          <div class="project-header">
            <h3 class="project-name">{{ project.name }}</h3>
            <span :class="['badge', getStatusClass(project.status as string)]">
              {{ getStatusText(project.status as string) }}
            </span>
          </div>
          <p class="project-desc">{{ project.description }}</p>
          <div class="project-tech">
            <span
              v-for="tech in project.techStack"
              :key="tech"
              class="tech-tag"
            >
              {{ tech }}
            </span>
          </div>
          <div class="project-footer">
            <a
              v-if="project.link"
              :href="project.link"
              target="_blank"
              rel="noopener noreferrer"
              class="project-link"
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
                <path
                  d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                ></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              查看项目
            </a>
            <div class="project-actions">
              <button
                class="action-btn"
                title="编辑"
                @click="openEditModal(project)"
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
                @click="deleteProject(project)"
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
    </div>

    <!-- 统计信息 -->
    <div class="stats-bar">
      <span>共 {{ filteredProjects.length }} 个项目</span>
    </div>

    <!-- 编辑模态框 -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ isNewProject ? "添加项目" : "编辑项目" }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <!-- 项目名称 -->
          <div class="form-group">
            <label class="form-label">项目名称 *</label>
            <input
              v-model="form.name"
              type="text"
              class="input"
              placeholder="输入项目名称"
            />
          </div>

          <!-- 项目描述 -->
          <div class="form-group">
            <label class="form-label">项目描述</label>
            <textarea
              v-model="form.description"
              class="input textarea"
              rows="3"
              placeholder="简要描述项目功能和特点"
            ></textarea>
          </div>

          <!-- 项目链接 -->
          <div class="form-group">
            <label class="form-label">项目链接</label>
            <input
              v-model="form.link"
              type="url"
              class="input"
              placeholder="https://github.com/..."
            />
          </div>

          <!-- 状态 -->
          <div class="form-group">
            <label class="form-label">项目状态</label>
            <div class="status-options">
              <button
                v-for="opt in statusOptions"
                :key="opt.value"
                :class="[
                  'status-btn',
                  `status-${opt.color}`,
                  { active: form.status === opt.value },
                ]"
                @click="form.status = opt.value as Project['status']"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- 技术栈 -->
          <div class="form-group">
            <label class="form-label">技术栈</label>
            <div class="tech-input-container">
              <div v-if="form.techStack.length > 0" class="tech-list">
                <span
                  v-for="tech in form.techStack"
                  :key="tech"
                  class="tech-tag removable"
                >
                  {{ tech }}
                  <button class="tag-remove" @click="removeTech(tech)">
                    ×
                  </button>
                </span>
              </div>
              <input
                v-model="techInput"
                type="text"
                class="input"
                placeholder="输入技术名称后按回车添加"
                @keydown="handleTechKeydown"
                @blur="addTech"
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
          <button
            class="btn btn-primary"
            @click="saveProject"
            :disabled="saving"
          >
            <span v-if="saving" class="spinner small"></span>
            {{ saving ? "保存中..." : "保存" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-list {
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

/* 消息提示 */
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
  max-width: 300px;
}

.filter-item:first-child {
  flex: 2;
  max-width: 400px;
}

/* 项目网格 */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.project-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.5rem;
  transition: all 0.2s ease;
}

.project-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.project-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.project-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.project-desc {
  font-size: 0.875rem;
  color: #64748b;
  line-height: 1.6;
  margin: 0 0 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-tech {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: 1rem;
}

.tech-tag {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: #f1f5f9;
  color: #475569;
  border-radius: 0.25rem;
}

.tech-tag.removable {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: #eff6ff;
  color: #2563eb;
}

.tag-remove {
  background: none;
  border: none;
  color: #2563eb;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.tag-remove:hover {
  color: #dc2626;
}

.project-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 1rem;
  border-top: 1px solid #f1f5f9;
}

.project-link {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: #2563eb;
  text-decoration: none;
}

.project-link:hover {
  text-decoration: underline;
}

.project-actions {
  display: flex;
  gap: 0.5rem;
}

/* Badge */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 9999px;
}

.badge-success {
  background: #dcfce7;
  color: #16a34a;
}

.badge-primary {
  background: #dbeafe;
  color: #2563eb;
}

.badge-gray {
  background: #f1f5f9;
  color: #64748b;
}

/* 状态选项 */
.status-options {
  display: flex;
  gap: 0.5rem;
}

.status-btn {
  flex: 1;
  padding: 0.625rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background: white;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-btn:hover {
  border-color: #cbd5e1;
}

.status-btn.active.status-green {
  border-color: #16a34a;
  background: #f0fdf4;
  color: #16a34a;
}

.status-btn.active.status-blue {
  border-color: #2563eb;
  background: #eff6ff;
  color: #2563eb;
}

.status-btn.active.status-gray {
  border-color: #64748b;
  background: #f8fafc;
  color: #64748b;
}

/* 技术栈输入 */
.tech-input-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tech-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

/* 操作按钮 */
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
  max-width: 560px;
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

.textarea {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
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

  .filter-bar {
    flex-direction: column;
  }

  .filter-item,
  .filter-item:first-child {
    max-width: none;
  }

  .projects-grid {
    grid-template-columns: 1fr;
  }

  .status-options {
    flex-direction: column;
  }
}
</style>
