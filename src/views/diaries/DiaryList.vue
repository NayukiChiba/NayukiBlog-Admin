<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import { usePendingChangesStore } from "@/stores/pendingChanges";
import { githubAPI, type Diary } from "@/api/github";
import { isDevPreviewMode } from "@/router";
import {
  PageHeader,
  MessageBox,
  Modal,
  LoadingState,
  EmptyState,
  FormGroup,
  SvgIcon,
  ImageUpload,
  DevPreviewBanner,
} from "@/components/common";

const authStore = useAuthStore();
const pendingChangesStore = usePendingChangesStore();

// 是否为开发预览模式
const isPreviewMode = ref(false);

// 状态
const loading = ref(false);
const saving = ref(false);
const diaries = ref<Diary[]>([]);
const dataSha = ref("");
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);

// 编辑模态框
const showModal = ref(false);
const editingDiary = ref<Diary | null>(null);
const isNewDiary = ref(false);

// 获取 UTC+8 时间字符串，格式: YYYY-MM-DDTHH:mm
function getUTC8DateTimeString(): string {
  const utc8 = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const year = utc8.getUTCFullYear();
  const month = String(utc8.getUTCMonth() + 1).padStart(2, "0");
  const day = String(utc8.getUTCDate()).padStart(2, "0");
  const hours = String(utc8.getUTCHours()).padStart(2, "0");
  const minutes = String(utc8.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// 表单数据
const form = ref<Diary>({
  id: 0,
  date: getUTC8DateTimeString(),
  content: "",
  mood: "happy",
  weather: "sunny",
  images: [],
});

// 心情选项
const moodOptions = [
  { value: "happy", label: "开心", icon: "😊" },
  { value: "excited", label: "兴奋", icon: "🎉" },
  { value: "neutral", label: "平静", icon: "😐" },
  { value: "sad", label: "难过", icon: "😢" },
  { value: "tired", label: "疲惫", icon: "😫" },
  { value: "angry", label: "生气", icon: "😠" },
];

// 天气选项
const weatherOptions = [
  { value: "sunny", label: "晴天", icon: "☀️" },
  { value: "cloudy", label: "多云", icon: "☁️" },
  { value: "rainy", label: "下雨", icon: "🌧️" },
  { value: "snowy", label: "下雪", icon: "❄️" },
  { value: "windy", label: "大风", icon: "💨" },
];

// 心情图标映射
const moodIcons: Record<string, string> = {
  happy: "😊",
  excited: "🎉",
  neutral: "😐",
  sad: "😢",
  tired: "😫",
  angry: "😠",
};

// 天气图标映射
const weatherIcons: Record<string, string> = {
  sunny: "☀️",
  cloudy: "☁️",
  rainy: "🌧️",
  snowy: "❄️",
  windy: "💨",
};

// 筛选：年月
const selectedYear = ref("");
const selectedMonth = ref("");

// 获取所有年份
const availableYears = computed(() => {
  const years = new Set(
    diaries.value.map((d) => new Date(d.date).getFullYear().toString())
  );
  return Array.from(years).sort((a, b) => Number(b) - Number(a));
});

// 获取所有月份（1-12）
const availableMonths = computed(() => {
  return Array.from({ length: 12 }, (_, i) => {
    const month = (i + 1).toString().padStart(2, "0");
    return { value: month, label: `${i + 1}月` };
  });
});

// 筛选后的日记
const filteredDiaries = computed(() => {
  return diaries.value.filter((diary) => {
    const diaryDate = new Date(diary.date);
    const diaryYear = diaryDate.getFullYear().toString();
    const diaryMonth = (diaryDate.getMonth() + 1).toString().padStart(2, "0");

    const matchesYear = !selectedYear.value || diaryYear === selectedYear.value;
    const matchesMonth =
      !selectedMonth.value || diaryMonth === selectedMonth.value;

    return matchesYear && matchesMonth;
  });
});

// 按日期排序的日记
const sortedDiaries = computed(() => {
  return [...filteredDiaries.value].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
});

// 获取日记列表
async function fetchDiaries() {
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
    const result = await githubAPI.getDiaries();
    diaries.value = result.diaries;
    dataSha.value = result.sha;
  } catch (err) {
    console.error("Failed to fetch diaries:", err);
    error.value = "获取日记列表失败";
    // 出错时保持空列表
    diaries.value = [];
  } finally {
    loading.value = false;
  }
}

// 打开新建模态框
function openNewModal() {
  isNewDiary.value = true;
  editingDiary.value = null;
  form.value = {
    id: Math.max(0, ...diaries.value.map((d) => d.id)) + 1,
    date: getUTC8DateTimeString(),
    content: "",
    mood: "happy",
    weather: "sunny",
    images: [],
  };
  showModal.value = true;
}

// 打开编辑模态框
function openEditModal(diary: Diary) {
  isNewDiary.value = false;
  editingDiary.value = diary;
  form.value = { ...diary, images: [...(diary.images || [])] };
  showModal.value = true;
}

// 关闭模态框
function closeModal() {
  showModal.value = false;
  editingDiary.value = null;
}

// 保存日记
async function saveDiary() {
  if (!form.value.content.trim()) {
    error.value = "请输入日记内容";
    return;
  }

  saving.value = true;
  error.value = null;

  try {
    if (isNewDiary.value) {
      diaries.value.unshift({ ...form.value });
    } else {
      const index = diaries.value.findIndex((d) => d.id === form.value.id);
      if (index !== -1) {
        diaries.value[index] = { ...form.value };
      }
    }

    // 添加到待提交变更（不立即保存到 GitHub）
    if (authStore.token && dataSha.value) {
      const description = isNewDiary.value ? "📔 新建日记" : "📔 更新日记";
      pendingChangesStore.addChange({
        path: 'src/data/diaries.json',
        type: isNewDiary.value ? 'create' : 'update',
        content: JSON.stringify({ diaries: diaries.value }, null, 2),
        sha: dataSha.value,
        description,
      });
    }

    successMessage.value = isNewDiary.value ? "日记已创建（待提交）" : "日记已更新（待提交）";
    setTimeout(() => (successMessage.value = null), 3000);
    closeModal();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "保存失败";
  } finally {
    saving.value = false;
  }
}

// 删除日记
async function deleteDiary(diary: Diary) {
  if (!confirm(`确定要删除这篇日记吗？`)) return;

  try {
    diaries.value = diaries.value.filter((d) => d.id !== diary.id);

    // 添加到待提交变更（不立即保存到 GitHub）
    if (authStore.token && dataSha.value) {
      pendingChangesStore.addChange({
        path: 'src/data/diaries.json',
        type: 'update',
        content: JSON.stringify({ diaries: diaries.value }, null, 2),
        sha: dataSha.value,
        description: "📔 删除日记",
      });
    }

    successMessage.value = "日记已删除（待提交）";
    setTimeout(() => (successMessage.value = null), 3000);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "删除失败";
    // 重新获取数据
    fetchDiaries();
  }
}

// 格式化日期
function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 格式化相对时间
function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "今天";
  if (days === 1) return "昨天";
  if (days < 7) return `${days} 天前`;
  if (days < 30) return `${Math.floor(days / 7)} 周前`;
  return `${Math.floor(days / 30)} 个月前`;
}

// 退出开发预览模式 - 由 DevPreviewBanner 组件处理
function handleExitPreview() {
  // 组件会处理跳转，这里只需刷新状态
  isPreviewMode.value = false;
}

onMounted(() => {
  fetchDiaries();
});
</script>

<template>
  <div class="diary-list page-container">
    <!-- 页面头部 -->
    <PageHeader title="日记" description="记录生活的点点滴滴">
      <template #actions>
        <button class="btn btn-primary" @click="openNewModal">
          <SvgIcon name="plus" :size="18" />
          写日记
        </button>
      </template>
    </PageHeader>

    <!-- 开发预览模式/未登录提示 -->
    <DevPreviewBanner
      :is-preview-mode="isPreviewMode"
      :is-logged-in="!!authStore.token"
      @exit-preview="handleExitPreview"
    />

    <!-- 成功提示 -->
    <MessageBox
      v-if="successMessage"
      type="success"
      :message="successMessage"
      closable
      @close="successMessage = null"
    />

    <!-- 错误提示 -->
    <MessageBox
      v-if="error"
      type="error"
      :message="error"
      closable
      @close="error = null"
    />

    <!-- 日记列表 -->
    <div class="diary-content">
      <!-- 筛选栏 -->
      <div class="filter-bar card">
        <div class="filter-item">
          <select v-model="selectedYear" class="input">
            <option value="">所有年份</option>
            <option v-for="year in availableYears" :key="year" :value="year">
              {{ year }}年
            </option>
          </select>
        </div>
        <div class="filter-item">
          <select v-model="selectedMonth" class="input">
            <option value="">所有月份</option>
            <option
              v-for="month in availableMonths"
              :key="month.value"
              :value="month.value"
            >
              {{ month.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- 统计栏 -->
      <div class="stats-bar">
        <span>共 {{ sortedDiaries.length }} 篇日记</span>
        <span
          v-if="sortedDiaries.length !== diaries.length"
          class="stats-filtered"
        >
          (已筛选，共 {{ diaries.length }} 篇)
        </span>
      </div>

      <!-- 加载状态 -->
      <LoadingState v-if="loading" text="加载中..." />

      <!-- 空状态 -->
      <EmptyState
        v-else-if="sortedDiaries.length === 0"
        icon="📔"
        title="暂无日记"
        description="开始记录你的生活吧"
      >
        <template #actions>
          <button class="btn btn-primary" @click="openNewModal">
            写第一篇日记
          </button>
        </template>
      </EmptyState>

      <!-- 日记时间线 -->
      <div v-else class="diary-timeline">
        <div v-for="diary in sortedDiaries" :key="diary.id" class="diary-item">
          <div class="timeline-dot"></div>
          <div class="diary-card">
            <div class="diary-header">
              <div class="diary-time">
                <span class="date">{{ formatDate(diary.date) }}</span>
                <span class="relative-time">{{
                  formatRelativeTime(diary.date)
                }}</span>
              </div>
              <div class="diary-meta">
                <span class="mood" :title="diary.mood">{{
                  moodIcons[diary.mood] || "😊"
                }}</span>
                <span class="weather" :title="diary.weather">{{
                  weatherIcons[diary.weather] || "☀️"
                }}</span>
              </div>
            </div>
            <div class="diary-content-text">{{ diary.content }}</div>

            <!-- 图片展示 -->
            <div
              v-if="diary.images && diary.images.length > 0"
              class="diary-images"
            >
              <img
                v-for="(img, idx) in diary.images"
                :key="idx"
                :src="img"
                :alt="`日记图片 ${idx + 1}`"
                class="diary-image"
              />
            </div>

            <div class="diary-actions">
              <button
                class="action-btn"
                title="编辑"
                @click="openEditModal(diary)"
              >
                <SvgIcon name="edit-2" :size="16" />
              </button>
              <button
                class="action-btn action-btn-danger"
                title="删除"
                @click="deleteDiary(diary)"
              >
                <SvgIcon name="trash" :size="16" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑模态框 -->
    <Modal
      :show="showModal"
      :title="isNewDiary ? '写日记' : '编辑日记'"
      width="600px"
      @close="closeModal"
    >
      <!-- 日期时间 -->
      <FormGroup label="日期时间">
        <input v-model="form.date" type="datetime-local" class="form-input" />
      </FormGroup>

      <!-- 心情和天气 -->
      <div class="form-row">
        <FormGroup label="心情">
          <div class="option-grid">
            <button
              v-for="option in moodOptions"
              :key="option.value"
              type="button"
              :class="['option-btn', { active: form.mood === option.value }]"
              @click="form.mood = option.value"
            >
              <span class="option-icon">{{ option.icon }}</span>
              <span class="option-label">{{ option.label }}</span>
            </button>
          </div>
        </FormGroup>
        <FormGroup label="天气">
          <div class="option-grid">
            <button
              v-for="option in weatherOptions"
              :key="option.value"
              type="button"
              :class="['option-btn', { active: form.weather === option.value }]"
              @click="form.weather = option.value"
            >
              <span class="option-icon">{{ option.icon }}</span>
              <span class="option-label">{{ option.label }}</span>
            </button>
          </div>
        </FormGroup>
      </div>

      <!-- 日记内容 -->
      <FormGroup label="内容" required>
        <textarea
          v-model="form.content"
          class="form-textarea"
          rows="6"
          placeholder="今天发生了什么..."
        ></textarea>
      </FormGroup>

      <!-- 图片上传 -->
      <FormGroup label="图片" hint="最多可添加2张图片">
        <ImageUpload
          v-model="form.images"
          :max-images="2"
          placeholder="输入图片URL添加"
        />
      </FormGroup>

      <template #footer>
        <button
          class="btn btn-secondary"
          @click="closeModal"
          :disabled="saving"
        >
          取消
        </button>
        <button class="btn btn-primary" @click="saveDiary" :disabled="saving">
          <span v-if="saving" class="spinner"></span>
          {{ saving ? "保存中..." : "保存" }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.diary-list {
  width: 100%;
}

.diary-content {
  max-width: 800px;
}

/* 按钮样式 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #6366f1;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #4f46e5;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.exit-preview-btn {
  margin-left: auto;
  padding: 4px 12px;
  font-size: 12px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.exit-preview-btn:hover {
  background: #4f46e5;
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
  max-width: 200px;
}

.input {
  width: 100%;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: white;
  color: #1f2937;
  outline: none;
  transition: border-color 0.2s ease;
}

.input:focus {
  border-color: #6366f1;
}

/* 统计栏 */
.stats-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 24px;
}

.stats-filtered {
  color: #9ca3af;
}

/* 日记时间线 */
.diary-timeline {
  position: relative;
  padding-left: 24px;
}

.diary-timeline::before {
  content: "";
  position: absolute;
  left: 7px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e5e7eb;
}

.diary-item {
  position: relative;
  margin-bottom: 24px;
}

.diary-item:last-child {
  margin-bottom: 0;
}

.timeline-dot {
  position: absolute;
  left: -24px;
  top: 20px;
  width: 16px;
  height: 16px;
  background: white;
  border: 3px solid #6366f1;
  border-radius: 50%;
  z-index: 1;
}

.diary-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  transition: box-shadow 0.2s;
}

.diary-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.diary-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.diary-time {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.date {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.relative-time {
  font-size: 12px;
  color: #9ca3af;
}

.diary-meta {
  display: flex;
  gap: 8px;
  font-size: 20px;
}

.diary-content-text {
  font-size: 15px;
  line-height: 1.7;
  color: #374151;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 日记图片 */
.diary-images {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.diary-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.diary-image:hover {
  transform: scale(1.02);
}

.diary-images:has(.diary-image:only-child) {
  grid-template-columns: 1fr;
}

.diary-images:has(.diary-image:only-child) .diary-image {
  max-width: 400px;
}

.diary-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
  opacity: 0;
  transition: opacity 0.2s;
}

.diary-card:hover .diary-actions {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: #f3f4f6;
  border-radius: 6px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.action-btn-danger:hover {
  background: #fee2e2;
  color: #dc2626;
}

/* 表单样式 */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.option-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.option-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 8px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.option-btn:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.option-btn.active {
  background: #eef2ff;
  border-color: #6366f1;
  color: #4f46e5;
}

.option-icon {
  font-size: 20px;
}

.option-label {
  font-size: 12px;
  color: #6b7280;
}

.option-btn.active .option-label {
  color: #4f46e5;
}

.spinner {
  width: 16px;
  height: 16px;
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

/* 响应式 */
@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .option-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .diary-timeline {
    padding-left: 20px;
  }

  .timeline-dot {
    left: -20px;
    width: 12px;
    height: 12px;
  }

  .diary-images {
    grid-template-columns: 1fr;
  }
}
</style>
