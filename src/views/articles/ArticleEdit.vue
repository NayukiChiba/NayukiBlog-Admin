<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { usePendingChangesStore } from "@/stores/pendingChanges";
import { githubAPI, type Article } from "@/api/github";
import { isDevPreviewMode } from "@/router";
import {
  MessageBox,
  LoadingState,
  FormGroup,
  SvgIcon,
  FolderPickerModal,
  type CategoryNode,
} from "@/components/common";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const pendingChangesStore = usePendingChangesStore();

// 是否为开发预览模式
const isPreviewMode = ref(false);

// 获取完整的 slug 路径（支持多级目录）
const fullSlug = computed(() => {
  const slug = route.params.slug;
  if (Array.isArray(slug)) {
    return slug.join("/");
  }
  return slug as string || "";
});

// 是否是编辑模式
const isEditMode = computed(() => !!fullSlug.value);
const pageTitle = computed(() => (isEditMode.value ? "编辑文章" : "新建文章"));

// 状态
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const originalSha = ref<string | undefined>(undefined);

// 表单数据
const form = ref<Omit<Article, "sha"> & { sha?: string }>(
  {
    slug: "",
    title: "",
    date: new Date().toISOString().split("T")[0],
    category: "技术",
    tags: [],
    description: "",
    image: "https://img.yumeko.site/file/wife/早坂爱.jpg",
    status: "public",
    content: "",
    folder: "",
  },
);

// 标签输入
const tagInput = ref("");

// 分类树结构
const categoryTree: CategoryNode[] = [
  {
    name: "技术",
    path: "技术",
    children: [
      { name: "前端开发", path: "技术/前端开发" },
      { name: "后端开发", path: "技术/后端开发" },
      { name: "DevOps", path: "技术/DevOps" },
      { name: "数据库", path: "技术/数据库" },
    ],
  },
  {
    name: "生活",
    path: "生活",
    children: [
      { name: "日常", path: "生活/日常" },
      { name: "旅行", path: "生活/旅行" },
      { name: "美食", path: "生活/美食" },
    ],
  },
  {
    name: "随笔",
    path: "随笔",
  },
  {
    name: "教程",
    path: "教程",
    children: [
      { name: "入门教程", path: "教程/入门教程" },
      { name: "进阶教程", path: "教程/进阶教程" },
    ],
  },
  {
    name: "其他",
    path: "其他",
  },
];

// 状态选项
const statusOptions = [
  { value: "public", label: "公开", color: "green" },
  { value: "draft", label: "草稿", color: "yellow" },
  { value: "private", label: "私密", color: "gray" },
];

// 预览模式
const showPreview = ref(false);
const showFolderPicker = ref(false);

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

// 生成 slug
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u4e00-\u9fa5-]/g, "")
    .slice(0, 50);
}

// 自动生成 slug
watch(
  () => form.value.title,
  (newTitle) => {
    if (!isEditMode.value && newTitle) {
      form.value.slug = generateSlug(newTitle);
    }
  },
);

// 选择分类
function selectCategory(path: string) {
  form.value.category = path;
}

// 创建新文件夹（这里只是演示，实际需要更新 categoryTree）
function handleCreateFolder(parentPath: string, folderName: string) {
  // 构建新路径
  const newPath = parentPath ? `${parentPath}/${folderName}` : folderName;

  // TODO: 这里应该调用 API 创建文件夹，或者更新本地 categoryTree
  // 目前先简单地选中这个新路径
  form.value.category = newPath;

  console.log("创建文件夹:", { parentPath, folderName, newPath });
}

// 获取分类显示名称
function getCategoryDisplayName(path: string): string {
  return path.split("/").pop() || path;
}

// 退出开发预览模式
function exitPreviewMode() {
  localStorage.removeItem("dev_preview");
  window.location.href = "/login";
}

// 获取文章内容（编辑模式）
async function fetchArticle() {
  // 检查是否为开发预览模式
  isPreviewMode.value = isDevPreviewMode();

  if (!isEditMode.value) return;

  // 没有 token 时不尝试获取数据
  if (!authStore.token) {
    loading.value = false;
    error.value = "未登录，无法获取文章内容";
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const slug = fullSlug.value;

    githubAPI.init(authStore.token);
    const article = await githubAPI.getArticle(slug);

    if (article) {
      form.value = {
        slug: article.slug,
        title: article.title,
        date: article.date,
        category: article.category,
        tags: [...article.tags],
        description: article.description,
        image: article.image,
        status: article.status,
        content: article.content,
        folder: article.folder || "",
      };
      originalSha.value = article.sha;
    } else {
      error.value = "文章不存在";
    }
  } catch (err) {
    console.error("Failed to fetch article:", err);
    error.value = err instanceof Error ? err.message : "加载失败";
  } finally {
    loading.value = false;
  }
}

// 保存文章
async function saveArticle() {
  // 验证表单
  if (!form.value.title.trim()) {
    error.value = "请输入文章标题";
    return;
  }

  if (!form.value.content.trim()) {
    error.value = "请输入文章内容";
    return;
  }

  // 确保有 slug（从标题自动生成）
  if (!form.value.slug) {
    form.value.slug = generateSlug(form.value.title);
  }

  saving.value = true;
  error.value = null;

  try {
    if (authStore.token) {
      githubAPI.init(authStore.token);

      // 从完整 slug 中提取文件名和文件夹
      const fullSlugValue = form.value.slug;
      let folder = form.value.folder || "";
      let slugName = fullSlugValue;
      
      // 如果 slug 包含路径分隔符，提取文件夹和文件名
      if (fullSlugValue.includes("/")) {
        const lastSlashIndex = fullSlugValue.lastIndexOf("/");
        folder = fullSlugValue.substring(0, lastSlashIndex);
        slugName = fullSlugValue.substring(lastSlashIndex + 1);
      }

      const articleData: Article = {
        slug: slugName, // 只使用文件名部分
        title: form.value.title.trim(),
        date: form.value.date,
        category: form.value.category,
        tags: form.value.tags,
        description: form.value.description.trim(),
        image: form.value.image.trim(),
        status: form.value.status,
        content: form.value.content,
        sha: originalSha.value,
        folder, // 传递文件夹路径
      };

      // 生成文件路径和 Markdown 内容
      const folderPrefix = folder ? `${folder}/` : '';
      const path = `src/content/blog/${folderPrefix}${slugName}.md`;
      const markdownContent = githubAPI.generateMarkdownContent(articleData);
      
      // 添加到待提交变更（不立即保存到 GitHub）
      const description = isEditMode.value
        ? `✏️ 更新文章: ${articleData.title}`
        : `📝 新建文章: ${articleData.title}`;
      
      pendingChangesStore.addChange({
        path,
        type: isEditMode.value ? 'update' : 'create',
        content: markdownContent,
        sha: originalSha.value || '',
        description,
      });

      successMessage.value = isEditMode.value
        ? "文章更新成功（待提交）"
        : "文章创建成功（待提交）";

      // 延迟跳转
      setTimeout(() => {
        router.push("/articles");
      }, 1500);
    } else {
      // 开发模式模拟保存
      await new Promise((resolve) => setTimeout(resolve, 1000));
      successMessage.value = "保存成功（开发模式，未实际保存）";

      setTimeout(() => {
        router.push("/articles");
      }, 1500);
    }
  } catch (err) {
    console.error("Failed to save article:", err);
    error.value = err instanceof Error ? err.message : "保存失败";
  } finally {
    saving.value = false;
  }
}

// 取消编辑
function cancelEdit() {
  if (form.value.content.trim() || form.value.title.trim()) {
    if (!confirm("确定要放弃编辑吗？未保存的内容将丢失。")) {
      return;
    }
  }
  router.push("/articles");
}

// 插入 Markdown 语法
function insertMarkdown(syntax: string, placeholder = "") {
  const textarea = document.querySelector(
    ".editor-textarea",
  ) as HTMLTextAreaElement;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = form.value.content.substring(start, end) || placeholder;

  let insertText = "";
  let cursorOffset = 0;

  switch (syntax) {
    case "bold":
      insertText = `**${selectedText}**`;
      cursorOffset = selectedText ? insertText.length : 2;
      break;
    case "italic":
      insertText = `*${selectedText}*`;
      cursorOffset = selectedText ? insertText.length : 1;
      break;
    case "code":
      insertText = `\`${selectedText}\``;
      cursorOffset = selectedText ? insertText.length : 1;
      break;
    case "codeblock":
      insertText = `\n\`\`\`\n${selectedText}\n\`\`\`\n`;
      cursorOffset = 5;
      break;
    case "link":
      insertText = `[${selectedText || "链接文字"}](url)`;
      cursorOffset = selectedText ? insertText.length : 1;
      break;
    case "image":
      insertText = `![${selectedText || "图片描述"}](url)`;
      cursorOffset = selectedText ? insertText.length : 2;
      break;
    case "h1":
      insertText = `# ${selectedText}`;
      cursorOffset = 2;
      break;
    case "h2":
      insertText = `## ${selectedText}`;
      cursorOffset = 3;
      break;
    case "h3":
      insertText = `### ${selectedText}`;
      cursorOffset = 4;
      break;
    case "list":
      insertText = `\n- ${selectedText}`;
      cursorOffset = 3;
      break;
    case "quote":
      insertText = `\n> ${selectedText}`;
      cursorOffset = 3;
      break;
    default:
      return;
  }

  form.value.content =
    form.value.content.substring(0, start) +
    insertText +
    form.value.content.substring(end);

  // 聚焦并设置光标位置
  setTimeout(() => {
    textarea.focus();
    const newPosition = start + cursorOffset;
    textarea.setSelectionRange(newPosition, newPosition);
  }, 0);
}

// 简单的 Markdown 预览转换
const previewHtml = computed(() => {
  return (
    form.value.content
      // 代码块
      .replace(
        /```(\w*)\n([\s\S]*?)```/g,
        '<pre><code class="language-$1">$2</code></pre>',
      )
      // 行内代码
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      // 标题
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      // 粗体和斜体
      .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      // 链接和图片
      .replace(
        /!\[([^\]]*)\]\(([^)]+)\)/g,
        '<img src="$2" alt="$1" style="max-width:100%">',
      )
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank">$1</a>',
      )
      // 引用
      .replace(/^> (.*$)/gim, "<blockquote>$1</blockquote>")
      // 列表
      .replace(/^- (.*$)/gim, "<li>$1</li>")
      // 换行
      .replace(/\n/g, "<br>")
  );
});

onMounted(() => {
  fetchArticle();
});
</script>

<template>
  <div class="article-edit page-container">
    <!-- 顶部操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="cancelEdit">
          <SvgIcon name="arrow-left" :size="18" />
          返回
        </button>
        <h2 class="page-title">{{ pageTitle }}</h2>
      </div>
      <div class="header-right">
        <button
          :class="['btn', 'btn-outline', { active: showPreview }]"
          @click="showPreview = !showPreview"
        >
          <SvgIcon :name="showPreview ? 'edit-2' : 'eye'" :size="16" />
          {{ showPreview ? "编辑" : "预览" }}
        </button>
        <button
          class="btn btn-secondary"
          @click="cancelEdit"
          :disabled="saving"
        >
          取消
        </button>
        <button class="btn btn-primary" @click="saveArticle" :disabled="saving">
          <span v-if="saving" class="spinner"></span>
          {{ saving ? "保存中..." : "保存文章" }}
        </button>
      </div>
    </div>

    <!-- 成功提示 -->
    <MessageBox
      v-if="successMessage"
      type="success"
      :message="successMessage"
      closable
      @close="successMessage = null"
    />

    <!-- 开发预览模式提示 -->
    <MessageBox v-if="isPreviewMode && !authStore.token" type="preview">
      开发预览模式 - 当前为样式测试，数据不会被获取或保存。
      <router-link to="/login">前往登录</router-link>
      <button class="exit-preview-btn" @click="exitPreviewMode">
        退出预览
      </button>
    </MessageBox>

    <!-- 未登录提示（非预览模式） -->
    <MessageBox
      v-if="!isPreviewMode && !authStore.token && isEditMode"
      type="warning"
    >
      未登录，无法获取或保存文章。请
      <router-link to="/login">登录</router-link>
      后操作。
    </MessageBox>

    <!-- 错误提示 -->
    <MessageBox
      v-if="error"
      type="error"
      :message="error"
      closable
      @close="error = null"
    />

    <!-- 加载状态 -->
    <LoadingState v-if="loading" text="加载中..." />

    <!-- 编辑表单 -->
    <div v-else class="edit-container">
      <!-- 左侧：编辑区 -->
      <div class="edit-main">
        <!-- 标题输入 -->
        <FormGroup label="文章标题" required>
          <input
            v-model="form.title"
            type="text"
            class="title-input"
            placeholder="请输入文章标题..."
          />
        </FormGroup>

        <!-- 内容编辑器 -->
        <div class="editor-group">
          <label class="form-label">文章内容</label>

          <!-- 编辑器工具栏 -->
          <div v-if="!showPreview" class="editor-container">
            <div class="editor-toolbar">
              <div class="toolbar-group">
                <button
                  class="toolbar-btn"
                  title="一级标题"
                  @click="insertMarkdown('h1')"
                >
                  H1
                </button>
                <button
                  class="toolbar-btn"
                  title="二级标题"
                  @click="insertMarkdown('h2')"
                >
                  H2
                </button>
                <button
                  class="toolbar-btn"
                  title="三级标题"
                  @click="insertMarkdown('h3')"
                >
                  H3
                </button>
              </div>
              <div class="toolbar-divider"></div>
              <div class="toolbar-group">
                <button
                  class="toolbar-btn"
                  title="粗体"
                  @click="insertMarkdown('bold')"
                >
                  <strong>B</strong>
                </button>
                <button
                  class="toolbar-btn"
                  title="斜体"
                  @click="insertMarkdown('italic')"
                >
                  <em>I</em>
                </button>
                <button
                  class="toolbar-btn"
                  title="行内代码"
                  @click="insertMarkdown('code')"
                >
                  <code>&lt;/&gt;</code>
                </button>
              </div>
              <div class="toolbar-divider"></div>
              <div class="toolbar-group">
                <button
                  class="toolbar-btn"
                  title="链接"
                  @click="insertMarkdown('link')"
                >
                  <SvgIcon name="link" :size="14" />
                </button>
                <button
                  class="toolbar-btn"
                  title="图片"
                  @click="insertMarkdown('image')"
                >
                  <SvgIcon name="image" :size="14" />
                </button>
                <button
                  class="toolbar-btn"
                  title="代码块"
                  @click="insertMarkdown('codeblock')"
                >
                  <SvgIcon name="code" :size="14" />
                </button>
              </div>
              <div class="toolbar-divider"></div>
              <div class="toolbar-group">
                <button
                  class="toolbar-btn"
                  title="列表"
                  @click="insertMarkdown('list')"
                >
                  •
                </button>
                <button
                  class="toolbar-btn"
                  title="引用"
                  @click="insertMarkdown('quote')"
                >
                  "
                </button>
              </div>
            </div>
            <textarea
              v-model="form.content"
              class="editor-textarea"
              placeholder="使用 Markdown 格式编写文章内容..."
            ></textarea>
          </div>

          <!-- 预览区域 -->
          <div v-else class="preview-container">
            <div class="preview-content" v-html="previewHtml"></div>
          </div>
        </div>
      </div>

      <!-- 右侧：设置面板 -->
      <div class="edit-sidebar">
        <div class="card">
          <h3 class="card-title">文章设置</h3>

          <!-- 发布日期 -->
          <FormGroup label="发布日期">
            <input v-model="form.date" type="date" class="form-input" />
          </FormGroup>

          <!-- 分类 - 文件夹选择弹窗 -->
          <FormGroup label="分类">
            <div class="category-selector">
              <button
                type="button"
                class="category-trigger"
                @click="showFolderPicker = true"
              >
                <SvgIcon name="folder" :size="16" />
                <span>{{ getCategoryDisplayName(form.category) }}</span>
                <SvgIcon
                  name="chevron-right"
                  :size="14"
                  class="trigger-arrow"
                />
              </button>
            </div>
            <p class="form-hint">当前路径: {{ form.category }}</p>
          </FormGroup>

          <!-- 状态 -->
          <FormGroup label="发布状态">
            <div class="status-options">
              <button
                v-for="opt in statusOptions"
                :key="opt.value"
                type="button"
                :class="[
                  'status-btn',
                  `status-${opt.color}`,
                  { active: form.status === opt.value },
                ]"
                @click="
                  form.status = opt.value as 'public' | 'draft' | 'private'
                "
              >
                {{ opt.label }}
              </button>
            </div>
          </FormGroup>

          <!-- 标签 -->
          <FormGroup label="标签">
            <div class="tags-input-container">
              <div v-if="form.tags.length" class="tags-list">
                <span v-for="tag in form.tags" :key="tag" class="tag">
                  {{ tag }}
                  <button
                    type="button"
                    class="tag-remove"
                    @click="removeTag(tag)"
                  >
                    ×
                  </button>
                </span>
              </div>
              <input
                v-model="tagInput"
                type="text"
                class="form-input"
                placeholder="输入标签后按回车添加"
                @keydown="handleTagKeydown"
                @blur="addTag"
              />
            </div>
          </FormGroup>

          <!-- 描述 -->
          <FormGroup label="文章描述">
            <textarea
              v-model="form.description"
              class="form-textarea"
              rows="3"
              placeholder="简短描述文章内容（用于 SEO 和列表显示）"
            ></textarea>
          </FormGroup>

          <!-- 封面图片 -->
          <FormGroup label="封面图片">
            <input
              v-model="form.image"
              type="text"
              class="form-input"
              placeholder="图片 URL"
            />
            <div v-if="form.image" class="image-preview">
              <img :src="form.image" alt="封面预览" />
            </div>
          </FormGroup>
        </div>
      </div>
    </div>

    <!-- 文件夹选择弹窗 -->
    <FolderPickerModal
      :show="showFolderPicker"
      :model-value="form.category"
      :categories="categoryTree"
      @update:model-value="selectCategory"
      @close="showFolderPicker = false"
      @create-folder="handleCreateFolder"
    />
  </div>
</template>

<style scoped>
.article-edit {
  width: 100%;
}

/* 页面头部 */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: #6b7280;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: #f9fafb;
  color: #1f2937;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 12px;
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

/* 编辑容器 */
.edit-container {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 24px;
}

/* 左侧编辑区 */
.edit-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.title-input {
  width: 100%;
  padding: 16px;
  font-size: 24px;
  font-weight: 600;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  color: #1f2937;
  outline: none;
  transition: border-color 0.2s ease;
}

.title-input:focus {
  border-color: #6366f1;
}

.title-input::placeholder {
  color: #9ca3af;
}

/* 编辑器 */
.editor-group {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  gap: 2px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #e5e7eb;
  margin: 0 6px;
}

.toolbar-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: #6b7280;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toolbar-btn:hover {
  background: #e5e7eb;
  color: #1f2937;
}

.editor-textarea {
  flex: 1;
  min-height: 500px;
  padding: 16px;
  border: none;
  resize: none;
  font-family: "JetBrains Mono", "Fira Code", monospace;
  font-size: 14px;
  line-height: 1.8;
  color: #1f2937;
  outline: none;
}

.editor-textarea::placeholder {
  color: #9ca3af;
}

/* 预览区域 */
.preview-container {
  flex: 1;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  overflow: hidden;
}

.preview-content {
  padding: 24px;
  min-height: 500px;
  line-height: 1.8;
  color: #1f2937;
}

.preview-content :deep(h1) {
  font-size: 28px;
  font-weight: 700;
  margin: 24px 0 16px;
  color: #0f172a;
}

.preview-content :deep(h2) {
  font-size: 24px;
  font-weight: 600;
  margin: 20px 0 12px;
  color: #1f2937;
}

.preview-content :deep(h3) {
  font-size: 20px;
  font-weight: 600;
  margin: 16px 0 8px;
  color: #374151;
}

.preview-content :deep(code) {
  padding: 2px 6px;
  background: #f1f5f9;
  border-radius: 4px;
  font-family: "JetBrains Mono", monospace;
  font-size: 0.875em;
  color: #e11d48;
}

.preview-content :deep(pre) {
  padding: 16px;
  background: #1e293b;
  border-radius: 8px;
  overflow-x: auto;
  margin: 16px 0;
}

.preview-content :deep(pre code) {
  background: none;
  color: #e2e8f0;
  padding: 0;
}

.preview-content :deep(blockquote) {
  padding-left: 16px;
  border-left: 4px solid #6366f1;
  color: #6b7280;
  font-style: italic;
  margin: 16px 0;
}

.preview-content :deep(a) {
  color: #6366f1;
  text-decoration: underline;
}

.preview-content :deep(li) {
  margin-left: 24px;
  list-style: disc;
}

/* 右侧设置面板 */
.edit-sidebar .card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  position: sticky;
  top: 24px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.form-hint {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
}

/* 分类选择器 */
.category-selector {
  position: relative;
}

.category-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #1f2937;
  cursor: pointer;
  transition: border-color 0.2s;
}

.category-trigger:hover {
  border-color: #d1d5db;
}

.category-trigger span {
  flex: 1;
  text-align: left;
}

.trigger-arrow {
  color: #6b7280;
}

.category-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  padding: 8px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  max-height: 300px;
  overflow-y: auto;
}

/* 状态选项 */
.status-options {
  display: flex;
  gap: 8px;
}

.status-btn {
  flex: 1;
  padding: 8px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-btn:hover {
  background: #f9fafb;
}

.status-btn.active.status-green {
  background: #dcfce7;
  border-color: #22c55e;
  color: #16a34a;
}

.status-btn.active.status-yellow {
  background: #fef3c7;
  border-color: #f59e0b;
  color: #d97706;
}

.status-btn.active.status-gray {
  background: #f3f4f6;
  border-color: #9ca3af;
  color: #6b7280;
}

/* 标签输入 */
.tags-input-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #eef2ff;
  color: #6366f1;
  font-size: 12px;
  border-radius: 4px;
}

.tag-remove {
  background: none;
  border: none;
  color: #6366f1;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.tag-remove:hover {
  color: #ef4444;
}

/* 图片预览 */
.image-preview {
  margin-top: 8px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.image-preview img {
  width: 100%;
  height: auto;
  display: block;
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

.btn-outline {
  background: white;
  color: #6b7280;
  border: 1px solid #e5e7eb;
}

.btn-outline:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
}

.btn-outline.active {
  background: #eef2ff;
  color: #6366f1;
  border-color: #6366f1;
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
@media (max-width: 1024px) {
  .edit-container {
    grid-template-columns: 1fr;
  }

  .edit-sidebar .card {
    position: static;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .header-right {
    width: 100%;
    flex-wrap: wrap;
  }

  .header-right .btn {
    flex: 1;
    min-width: 100px;
  }

  .toolbar-divider {
    display: none;
  }

  .editor-toolbar {
    gap: 4px;
  }
}
</style>
