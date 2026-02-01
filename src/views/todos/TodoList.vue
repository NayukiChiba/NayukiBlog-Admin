<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import { usePendingChangesStore } from "@/stores/pendingChanges";
import { githubAPI, type Todo } from "@/api/github";
import { isDevPreviewMode } from "@/router";
import { DevPreviewBanner } from "@/components/common";

const authStore = useAuthStore();
const pendingChangesStore = usePendingChangesStore();

// 是否为开发预览模式
const isPreviewMode = ref(false);

// 状态
const loading = ref(false);
const saving = ref(false);
const todos = ref<Todo[]>([]);
const dataSha = ref("");
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);

// 模态框
const showModal = ref(false);
const editingTodo = ref<Todo | null>(null);
const isNewTodo = ref(false);

// 表单
const form = ref({
  id: 0,
  task: "",
  completed: false,
  priority: "medium" as "high" | "medium" | "low",
  type: "short-term" as "short-term" | "mid-term" | "long-term",
  progress: 0,
  icon: "📋",
  status: "active",
});

// 优先级选项
const priorityOptions = [
  { value: "high", label: "高", color: "red" },
  { value: "medium", label: "中", color: "yellow" },
  { value: "low", label: "低", color: "green" },
];

// 类型选项
const typeOptions = [
  { value: "short-term", label: "短期目标", icon: "⚡" },
  { value: "mid-term", label: "中期目标", icon: "📅" },
  { value: "long-term", label: "长期目标", icon: "🎯" },
];

// 图标选项
// iconOptions 已移除 - 用户直接在 JSON 中填写 SVG 代码

// 按优先级和完成状态排序
const sortedTodos = computed(() => {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return [...todos.value].sort((a, b) => {
    // 未完成的排在前面
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    // 按优先级排序
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
});

// 统计信息
const stats = computed(() => {
  const total = todos.value.length;
  const completed = todos.value.filter((t) => t.completed).length;
  const shortTerm = todos.value.filter((t) => t.type === "short-term").length;
  const midTerm = todos.value.filter((t) => t.type === "mid-term").length;
  const longTerm = todos.value.filter((t) => t.type === "long-term").length;
  const avgProgress =
    todos.value.length > 0
      ? Math.round(todos.value.reduce((sum, t) => sum + t.progress, 0) / total)
      : 0;
  return { total, completed, shortTerm, midTerm, longTerm, avgProgress };
});

// 获取待办数据
async function fetchTodos() {
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
    const result = await githubAPI.getTodos();
    todos.value = result.todos;
    dataSha.value = result.sha;
  } catch (err) {
    console.error("Failed to fetch todos:", err);
    error.value = "获取待办数据失败";
    // 出错时保持空列表
    todos.value = [];
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
  isNewTodo.value = true;
  editingTodo.value = null;
  form.value = {
    id: Date.now(),
    task: "",
    completed: false,
    priority: "medium",
    type: "short-term",
    progress: 0,
    icon: "",
    status: "active",
  };
  showModal.value = true;
}

// 打开编辑模态框
function openEditModal(todo: Todo) {
  isNewTodo.value = false;
  editingTodo.value = todo;
  form.value = { ...todo };
  showModal.value = true;
}

// 关闭模态框
function closeModal() {
  showModal.value = false;
  editingTodo.value = null;
}

// 保存待办
async function saveTodo() {
  if (!form.value.task.trim()) {
    error.value = "请输入待办内容";
    return;
  }

  saving.value = true;
  error.value = null;

  try {
    const todoData: Todo = {
      id: form.value.id,
      task: form.value.task.trim(),
      completed: form.value.completed,
      priority: form.value.priority,
      type: form.value.type,
      progress: form.value.progress,
      icon: form.value.icon,
      status: form.value.completed ? "completed" : "active",
    };

    if (isNewTodo.value) {
      todos.value.unshift(todoData);
    } else {
      const index = todos.value.findIndex((t) => t.id === todoData.id);
      if (index !== -1) {
        todos.value[index] = todoData;
      }
    }

    // 添加到待提交变更（不立即保存到 GitHub）
    if (authStore.token) {
      const description = isNewTodo.value
        ? `✅ 添加待办: ${todoData.task}`
        : `✅ 更新待办: ${todoData.task}`;
      pendingChangesStore.addChange({
        path: 'src/data/todos.json',
        type: isNewTodo.value ? 'create' : 'update',
        content: JSON.stringify({ todos: todos.value }, null, 2),
        sha: dataSha.value,
        description,
      });
    }

    successMessage.value = isNewTodo.value
      ? "待办添加成功（待提交）"
      : "待办更新成功（待提交）";
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);

    closeModal();
  } catch (err) {
    console.error("Failed to save todo:", err);
    error.value = "保存失败，请重试";
  } finally {
    saving.value = false;
  }
}

// 切换完成状态
async function toggleComplete(todo: Todo) {
  const newCompleted = !todo.completed;
  const newProgress = newCompleted ? 100 : todo.progress;

  todo.completed = newCompleted;
  todo.progress = newProgress;
  todo.status = newCompleted ? "completed" : "active";

  try {
    if (authStore.token) {
      const description = newCompleted
        ? `✅ 完成待办: ${todo.task}`
        : `🔄 重新打开待办: ${todo.task}`;
      pendingChangesStore.addChange({
        path: 'src/data/todos.json',
        type: 'update',
        content: JSON.stringify({ todos: todos.value }, null, 2),
        sha: dataSha.value,
        description,
      });
    }
  } catch (err) {
    console.error("Failed to toggle todo:", err);
    // 恢复状态
    todo.completed = !newCompleted;
    todo.progress = todo.progress === 100 ? 0 : todo.progress;
    error.value = "操作失败，请重试";
  }
}

// 更新进度 - 保留函数以备将来使用（如添加进度滑块功能）
// async function updateProgress(todo: Todo, progress: number) {
//   const oldProgress = todo.progress;
//   todo.progress = progress;
//
//   if (progress === 100 && !todo.completed) {
//     todo.completed = true;
//     todo.status = "completed";
//   } else if (progress < 100 && todo.completed) {
//     todo.completed = false;
//     todo.status = "active";
//   }
//
//   try {
//     if (authStore.token) {
//       dataSha.value = await githubAPI.saveTodos(
//         todos.value,
//         dataSha.value,
//         `📊 更新待办进度: ${todo.task} (${progress}%)`,
//       );
//     }
//   } catch (err) {
//     console.error("Failed to update progress:", err);
//     todo.progress = oldProgress;
//     error.value = "更新进度失败";
//   }
// }

// 删除待办
async function deleteTodo(todo: Todo) {
  if (!confirm(`确定要删除「${todo.task}」吗？`)) return;

  try {
    todos.value = todos.value.filter((t) => t.id !== todo.id);

    // 添加到待提交变更（不立即保存到 GitHub）
    if (authStore.token) {
      pendingChangesStore.addChange({
        path: 'src/data/todos.json',
        type: 'delete',
        content: JSON.stringify({ todos: todos.value }, null, 2),
        sha: dataSha.value,
        description: `🗑️ 删除待办: ${todo.task}`,
      });
    }

    successMessage.value = "待办删除成功（待提交）";
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  } catch (err) {
    console.error("Failed to delete todo:", err);
    error.value = "删除失败，请重试";
    // 恢复数据
    fetchTodos();
  }
}

// 获取优先级样式类
function getPriorityClass(priority: string) {
  switch (priority) {
    case "high":
      return "priority-high";
    case "medium":
      return "priority-medium";
    case "low":
      return "priority-low";
    default:
      return "priority-medium";
  }
}

// 获取优先级文字
function getPriorityText(priority: string) {
  switch (priority) {
    case "high":
      return "高";
    case "medium":
      return "中";
    case "low":
      return "低";
    default:
      return priority;
  }
}

onMounted(() => {
  fetchTodos();
});
</script>

<template>
  <div class="todo-list">
    <!-- 开发预览模式/未登录提示 -->
    <DevPreviewBanner
      :is-preview-mode="isPreviewMode"
      :is-logged-in="!!authStore.token"
      @exit-preview="handleExitPreview"
    />

    <!-- 顶部操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <p class="page-description">管理你的目标和待办事项</p>
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
          新建待办
        </button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-icon">📋</span>
        <div class="stat-info">
          <span class="stat-value">{{ stats.total }}</span>
          <span class="stat-label">总待办</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">✅</span>
        <div class="stat-info">
          <span class="stat-value">{{ stats.completed }}</span>
          <span class="stat-label">已完成</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">⚡</span>
        <div class="stat-info">
          <span class="stat-value">{{ stats.shortTerm }}</span>
          <span class="stat-label">短期目标</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">📅</span>
        <div class="stat-info">
          <span class="stat-value">{{ stats.midTerm }}</span>
          <span class="stat-label">中期目标</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">🎯</span>
        <div class="stat-info">
          <span class="stat-value">{{ stats.longTerm }}</span>
          <span class="stat-label">长期目标</span>
        </div>
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

    <!-- 待办列表 -->
    <div class="card">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <span class="spinner"></span>
        <span>加载中...</span>
      </div>

      <!-- 空状态 -->
      <div v-else-if="sortedTodos.length === 0" class="empty-state">
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
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <p>暂无待办</p>
        <button class="btn btn-primary" @click="openNewModal">
          添加第一个待办
        </button>
      </div>

      <!-- 待办项 -->
      <div v-else class="todo-items">
        <div
          v-for="todo in sortedTodos"
          :key="todo.id"
          :class="['todo-item', { completed: todo.completed }]"
        >
          <!-- 完成复选框 -->
          <label class="todo-checkbox">
            <input
              type="checkbox"
              :checked="todo.completed"
              @change="toggleComplete(todo)"
            />
            <span class="checkmark"></span>
          </label>

          <!-- 图标 (SVG) -->
          <span class="todo-icon" v-html="todo.icon"></span>

          <!-- 内容 -->
          <div class="todo-content">
            <div class="todo-header">
              <span class="todo-task">{{ todo.task }}</span>
              <div class="todo-badges">
                <span :class="['badge', getPriorityClass(todo.priority)]">
                  {{ getPriorityText(todo.priority) }}
                </span>
                <span class="badge badge-type">
                  {{
                    todo.type === "short-term"
                      ? "短期"
                      : todo.type === "mid-term"
                        ? "中期"
                        : "长期"
                  }}
                </span>
              </div>
            </div>

            <!-- 进度条 -->
            <div class="progress-wrapper">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: `${todo.progress}%` }"
                  :class="{
                    'progress-complete': todo.progress === 100,
                  }"
                ></div>
              </div>
              <span class="progress-text">{{ todo.progress }}%</span>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="todo-actions">
            <button
              class="action-btn"
              title="编辑"
              @click="openEditModal(todo)"
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
              @click="deleteTodo(todo)"
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

    <!-- 编辑模态框 -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ isNewTodo ? "新建待办" : "编辑待办" }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <!-- 任务内容 -->
          <div class="form-group">
            <label class="form-label">待办内容 *</label>
            <input
              v-model="form.task"
              type="text"
              class="input"
              placeholder="输入待办事项"
            />
          </div>

          <!-- 类型 -->
          <div class="form-group">
            <label class="form-label">目标类型</label>
            <div class="type-options">
              <button
                v-for="opt in typeOptions"
                :key="opt.value"
                :class="['type-btn', { active: form.type === opt.value }]"
                @click="
                  form.type = opt.value as
                    | 'short-term'
                    | 'mid-term'
                    | 'long-term'
                "
              >
                <span class="type-icon">{{ opt.icon }}</span>
                <span>{{ opt.label }}</span>
              </button>
            </div>
          </div>

          <!-- 优先级 -->
          <div class="form-group">
            <label class="form-label">优先级</label>
            <div class="priority-options">
              <button
                v-for="opt in priorityOptions"
                :key="opt.value"
                :class="[
                  'priority-btn',
                  `priority-${opt.color}`,
                  { active: form.priority === opt.value },
                ]"
                @click="form.priority = opt.value as 'high' | 'medium' | 'low'"
              >
                {{ opt.label }}
              </button>
            </div>
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

          <!-- 进度 -->
          <div class="form-group">
            <label class="form-label">进度: {{ form.progress }}%</label>
            <input
              v-model.number="form.progress"
              type="range"
              min="0"
              max="100"
              step="5"
              class="progress-slider"
            />
          </div>

          <!-- 完成状态 -->
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.completed" />
              <span>标记为已完成</span>
            </label>
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
          <button class="btn btn-primary" @click="saveTodo" :disabled="saving">
            <span v-if="saving" class="spinner small"></span>
            {{ saving ? "保存中..." : "保存" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.todo-list {
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

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
}

.stat-icon {
  font-size: 1.5rem;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
}

.stat-label {
  font-size: 0.75rem;
  color: #64748b;
}

/* 预览模式提示 */
/* 提示消息样式 - 使用 DevPreviewBanner 组件代替 preview-message 和 warning-message */

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

/* 待办项 */
.todo-items {
  padding: 0.5rem;
}

.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 0.5rem;
  transition: background 0.2s ease;
}

.todo-item:hover {
  background: #f8fafc;
}

.todo-item.completed {
  opacity: 0.6;
}

.todo-item.completed .todo-task {
  text-decoration: line-through;
  color: #94a3b8;
}

/* 复选框 */
.todo-checkbox {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-top: 2px;
  cursor: pointer;
}

.todo-checkbox input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
}

.checkmark {
  width: 22px;
  height: 22px;
  border: 2px solid #d1d5db;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.todo-checkbox input:checked ~ .checkmark {
  background: #2563eb;
  border-color: #2563eb;
}

.todo-checkbox input:checked ~ .checkmark::after {
  content: "✓";
  color: white;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.todo-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.todo-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.todo-content {
  flex: 1;
  min-width: 0;
}

.todo-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.todo-task {
  font-weight: 500;
  color: #1e293b;
  line-height: 1.4;
}

.todo-badges {
  display: flex;
  gap: 0.375rem;
  flex-shrink: 0;
}

.badge {
  padding: 0.125rem 0.5rem;
  font-size: 0.625rem;
  font-weight: 500;
  border-radius: 9999px;
}

.priority-high {
  background: #fef2f2;
  color: #dc2626;
}

.priority-medium {
  background: #fefce8;
  color: #ca8a04;
}

.priority-low {
  background: #f0fdf4;
  color: #16a34a;
}

.badge-type {
  background: #f1f5f9;
  color: #64748b;
}

/* 进度条 */
.progress-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #2563eb;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-fill.progress-complete {
  background: #16a34a;
}

.progress-text {
  font-size: 0.75rem;
  color: #64748b;
  min-width: 36px;
  text-align: right;
}

/* 操作按钮 */
.todo-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.todo-item:hover .todo-actions {
  opacity: 1;
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
}

.empty-state svg {
  color: #cbd5e1;
}

.empty-state p {
  margin: 0;
  font-size: 1rem;
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

/* 类型选项 */
.type-options {
  display: flex;
  gap: 0.75rem;
}

.type-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.type-btn:hover {
  background: #f8fafc;
}

.type-btn.active {
  background: #eff6ff;
  border-color: #2563eb;
  color: #2563eb;
}

.type-icon {
  font-size: 1.25rem;
}

/* 优先级选项 */
.priority-options {
  display: flex;
  gap: 0.5rem;
}

.priority-btn {
  flex: 1;
  padding: 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.priority-btn:hover {
  background: #f8fafc;
}

.priority-btn.active.priority-red {
  background: #fef2f2;
  border-color: #dc2626;
  color: #dc2626;
}

.priority-btn.active.priority-yellow {
  background: #fefce8;
  border-color: #ca8a04;
  color: #ca8a04;
}

.priority-btn.active.priority-green {
  background: #f0fdf4;
  border-color: #16a34a;
  color: #16a34a;
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

/* 进度滑块 */
.progress-slider {
  width: 100%;
  height: 8px;
  -webkit-appearance: none;
  appearance: none;
  background: #e2e8f0;
  border-radius: 4px;
  outline: none;
}

.progress-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: #2563eb;
  border-radius: 50%;
  cursor: pointer;
}

.progress-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: #2563eb;
  border-radius: 50%;
  cursor: pointer;
  border: none;
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

  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .filter-bar {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .filter-tabs {
    width: 100%;
    overflow-x: auto;
  }

  .todo-header {
    flex-direction: column;
    gap: 0.5rem;
  }

  .todo-badges {
    order: -1;
  }

  .todo-actions {
    opacity: 1;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .type-options {
    flex-direction: column;
  }
}
</style>
