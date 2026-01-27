<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import { githubAPI, type Book } from "@/api/github";
import { isDevPreviewMode } from "@/router";

const authStore = useAuthStore();

// 是否为开发预览模式
const isPreviewMode = ref(false);

// 状态
const loading = ref(false);
const saving = ref(false);
const books = ref<Book[]>([]);
const dataSha = ref("");
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);

// 编辑模态框
const showModal = ref(false);
const editingBook = ref<Book | null>(null);
const isNewBook = ref(false);

// 筛选
const searchQuery = ref("");

// 表单数据
const form = ref<Book>({
    id: 0,
    title: "",
    cover: "",
    url: "",
    status: "published",
    rating: 5,
    tags: [],
});

// 标签输入
const tagInput = ref("");

// 评分选项
const ratingOptions = [1, 2, 3, 4, 5];

// 筛选后的书籍列表
const filteredBooks = computed(() => {
    return books.value.filter((book) => {
        const matchesSearch =
            !searchQuery.value ||
            book.title
                .toLowerCase()
                .includes(searchQuery.value.toLowerCase()) ||
            book.tags.some((tag) =>
                tag.toLowerCase().includes(searchQuery.value.toLowerCase()),
            );
        return matchesSearch;
    });
});

// 获取书籍列表
async function fetchBooks() {
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
        const result = await githubAPI.getBooks();
        books.value = result.books;
        dataSha.value = result.sha;
    } catch (err) {
        console.error("Failed to fetch books:", err);
        error.value = "获取书籍列表失败";
        // 出错时保持空列表
        books.value = [];
    } finally {
        loading.value = false;
    }
}

// 打开新建模态框
function openNewModal() {
    isNewBook.value = true;
    editingBook.value = null;
    form.value = {
        id: Math.max(0, ...books.value.map((b) => b.id)) + 1,
        title: "",
        cover: "https://img.yumeko.site/file/wife/早坂爱.jpg",
        url: "",
        status: "published",
        rating: 5,
        tags: [],
    };
    showModal.value = true;
}

// 打开编辑模态框
function openEditModal(book: Book) {
    isNewBook.value = false;
    editingBook.value = book;
    form.value = { ...book, tags: [...book.tags] };
    showModal.value = true;
}

// 关闭模态框
function closeModal() {
    showModal.value = false;
    editingBook.value = null;
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

// 保存书籍
async function saveBook() {
    if (!form.value.title.trim()) {
        error.value = "请输入书名";
        return;
    }

    saving.value = true;
    error.value = null;

    try {
        if (isNewBook.value) {
            books.value.unshift({ ...form.value });
        } else {
            const index = books.value.findIndex((b) => b.id === form.value.id);
            if (index !== -1) {
                books.value[index] = { ...form.value };
            }
        }

        // 保存到 GitHub
        if (authStore.token && dataSha.value) {
            const message = isNewBook.value
                ? `📚 新增书籍: ${form.value.title}`
                : `📚 更新书籍: ${form.value.title}`;
            dataSha.value = await githubAPI.saveBooks(
                books.value,
                dataSha.value,
                message,
            );
        }

        successMessage.value = isNewBook.value ? "书籍已添加" : "书籍已更新";
        setTimeout(() => (successMessage.value = null), 3000);
        closeModal();
    } catch (err) {
        error.value = err instanceof Error ? err.message : "保存失败";
    } finally {
        saving.value = false;
    }
}

// 删除书籍
async function deleteBook(book: Book) {
    if (!confirm(`确定要删除「${book.title}」吗？`)) return;

    try {
        books.value = books.value.filter((b) => b.id !== book.id);

        if (authStore.token && dataSha.value) {
            dataSha.value = await githubAPI.saveBooks(
                books.value,
                dataSha.value,
                `📚 删除书籍: ${book.title}`,
            );
        }

        successMessage.value = "书籍已删除";
        setTimeout(() => (successMessage.value = null), 3000);
    } catch (err) {
        error.value = err instanceof Error ? err.message : "删除失败";
        fetchBooks();
    }
}

// 渲染星星
function renderStars(rating: number): string {
    return "★".repeat(rating) + "☆".repeat(5 - rating);
}

// 退出开发预览模式
function exitPreviewMode() {
    localStorage.removeItem("dev_preview");
    window.location.href = "/login";
}

onMounted(() => {
    fetchBooks();
});
</script>

<template>
    <div class="book-list">
        <!-- 顶部操作栏 -->
        <div class="page-header">
            <div class="header-left">
                <p class="page-description">管理你的书单和阅读记录</p>
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
                    添加书籍
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

        <!-- 开发预览模式提示 -->
        <div v-if="isPreviewMode && !authStore.token" class="preview-message">
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
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span
                >开发预览模式 - 仅用于测试页面样式，数据功能需要<router-link
                    to="/login"
                    >登录</router-link
                ></span
            >
            <button @click="exitPreviewMode" class="exit-preview-btn">
                退出预览
            </button>
        </div>

        <!-- 未登录提示 -->
        <div v-else-if="!authStore.token" class="warning-message">
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
            <span
                >未登录，无法获取书籍列表。<router-link to="/login"
                    >点击登录</router-link
                ></span
            >
        </div>

        <!-- 搜索栏 -->
        <div class="search-bar card">
            <input
                v-model="searchQuery"
                type="text"
                class="input"
                placeholder="搜索书名或标签..."
            />
        </div>

        <!-- 书籍列表 -->
        <div class="books-container">
            <div v-if="loading" class="loading-state">
                <span class="spinner"></span>
                <span>加载中...</span>
            </div>

            <div v-else-if="filteredBooks.length === 0" class="empty-state">
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
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path
                        d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
                    ></path>
                </svg>
                <p>暂无书籍</p>
                <button class="btn btn-primary" @click="openNewModal">
                    添加第一本书
                </button>
            </div>

            <div v-else class="books-grid">
                <div
                    v-for="book in filteredBooks"
                    :key="book.id"
                    class="book-card"
                >
                    <div class="book-cover">
                        <img :src="book.cover" :alt="book.title" />
                    </div>
                    <div class="book-info">
                        <h3 class="book-title">{{ book.title }}</h3>
                        <div class="book-rating">
                            <span class="stars">{{
                                renderStars(book.rating)
                            }}</span>
                        </div>
                        <div class="book-tags">
                            <span
                                v-for="tag in book.tags.slice(0, 3)"
                                :key="tag"
                                class="tag"
                            >
                                {{ tag }}
                            </span>
                        </div>
                        <div class="book-actions">
                            <a
                                v-if="book.url"
                                :href="book.url"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="action-link"
                                title="查看详情"
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
                                    <polyline
                                        points="15 3 21 3 21 9"
                                    ></polyline>
                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                            </a>
                            <button
                                class="action-btn"
                                title="编辑"
                                @click="openEditModal(book)"
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
                                @click="deleteBook(book)"
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
            <span>共 {{ filteredBooks.length }} 本书</span>
        </div>

        <!-- 编辑模态框 -->
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
            <div class="modal">
                <div class="modal-header">
                    <h3>{{ isNewBook ? "添加书籍" : "编辑书籍" }}</h3>
                    <button class="close-btn" @click="closeModal">×</button>
                </div>
                <div class="modal-body">
                    <!-- 书名 -->
                    <div class="form-group">
                        <label class="form-label">书名 *</label>
                        <input
                            v-model="form.title"
                            type="text"
                            class="input"
                            placeholder="输入书名"
                        />
                    </div>

                    <!-- 封面 -->
                    <div class="form-group">
                        <label class="form-label">封面图片 URL</label>
                        <input
                            v-model="form.cover"
                            type="url"
                            class="input"
                            placeholder="https://..."
                        />
                        <div v-if="form.cover" class="cover-preview">
                            <img :src="form.cover" alt="封面预览" />
                        </div>
                    </div>

                    <!-- 链接 -->
                    <div class="form-group">
                        <label class="form-label">书籍链接</label>
                        <input
                            v-model="form.url"
                            type="url"
                            class="input"
                            placeholder="https://book.douban.com/..."
                        />
                    </div>

                    <!-- 评分 -->
                    <div class="form-group">
                        <label class="form-label">评分</label>
                        <div class="rating-options">
                            <button
                                v-for="r in ratingOptions"
                                :key="r"
                                :class="[
                                    'rating-btn',
                                    { active: form.rating >= r },
                                ]"
                                @click="form.rating = r"
                            >
                                ★
                            </button>
                        </div>
                    </div>

                    <!-- 标签 -->
                    <div class="form-group">
                        <label class="form-label">标签</label>
                        <div class="tags-input-container">
                            <div v-if="form.tags.length > 0" class="tags-list">
                                <span
                                    v-for="tag in form.tags"
                                    :key="tag"
                                    class="tag removable"
                                >
                                    {{ tag }}
                                    <button
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
                    <button
                        class="btn btn-primary"
                        @click="saveBook"
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
.book-list {
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

/* 搜索栏 */
.search-bar {
    padding: 1rem;
    margin-bottom: 1.5rem;
}

/* 书籍网格 */
.books-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1.5rem;
}

.book-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    overflow: hidden;
    transition: all 0.2s ease;
}

.book-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
}

.book-cover {
    width: 100%;
    aspect-ratio: 3 / 4;
    overflow: hidden;
    background: #f1f5f9;
}

.book-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.book-info {
    padding: 1rem;
}

.book-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 0.5rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.book-rating {
    margin-bottom: 0.5rem;
}

.stars {
    color: #f59e0b;
    font-size: 0.875rem;
    letter-spacing: 1px;
}

.book-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin-bottom: 0.75rem;
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
    color: #2563eb;
    font-size: 0.875rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
}

.tag-remove:hover {
    color: #dc2626;
}

.book-actions {
    display: flex;
    gap: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid #f1f5f9;
}

.action-link {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: #f1f5f9;
    border-radius: 0.375rem;
    color: #2563eb;
    text-decoration: none;
    transition: all 0.2s ease;
}

.action-link:hover {
    background: #eff6ff;
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

/* 评分选项 */
.rating-options {
    display: flex;
    gap: 0.25rem;
}

.rating-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    font-size: 1.25rem;
    color: #e2e8f0;
    cursor: pointer;
    transition: all 0.2s ease;
}

.rating-btn:hover {
    color: #f59e0b;
    transform: scale(1.1);
}

.rating-btn.active {
    color: #f59e0b;
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

/* 封面预览 */
.cover-preview {
    margin-top: 0.5rem;
    width: 80px;
    height: 107px;
    border-radius: 0.375rem;
    overflow: hidden;
    border: 1px solid #e2e8f0;
}

.cover-preview img {
    width: 100%;
    height: 100%;
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

    .books-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 480px) {
    .books-grid {
        grid-template-columns: 1fr;
    }
}
</style>
