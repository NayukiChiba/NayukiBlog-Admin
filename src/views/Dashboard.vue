<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import { githubAPI } from "@/api/github";
import { isDevPreviewMode } from "@/router";

const authStore = useAuthStore();

// 是否为开发预览模式
const isPreviewMode = ref(false);

// 统计数据 - count 为 null 表示未获取
const stats = ref([
    {
        label: "文章",
        count: null as number | null,
        icon: "article",
        color: "blue",
        path: "/articles",
    },
    {
        label: "日记",
        count: null as number | null,
        icon: "diary",
        color: "purple",
        path: "/diaries",
    },
    {
        label: "项目",
        count: null as number | null,
        icon: "project",
        color: "green",
        path: "/projects",
    },
    {
        label: "书籍",
        count: null as number | null,
        icon: "book",
        color: "orange",
        path: "/books",
    },
    {
        label: "图片",
        count: null as number | null,
        icon: "gallery",
        color: "pink",
        path: "/gallery",
    },
    {
        label: "待办",
        count: null as number | null,
        icon: "todo",
        color: "cyan",
        path: "/todos",
    },
]);

// 最近活动
const recentActivities = ref<
    Array<{ type: string; action: string; title: string; time: string }>
>([]);

// 快捷操作
const quickActions = [
    { label: "写文章", icon: "edit", path: "/articles/new", color: "primary" },
    {
        label: "写日记",
        icon: "diary",
        path: "/diaries?action=new",
        color: "purple",
    },
    { label: "管理项目", icon: "project", path: "/projects", color: "green" },
    { label: "查看工具", icon: "tools", path: "/tools", color: "orange" },
];

// 加载状态
const loading = ref(false);
const error = ref<string | null>(null);

// 获取统计数据
async function fetchStats() {
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
        const apiStats = await githubAPI.getStats();
        stats.value[0].count = apiStats.articles;
        stats.value[1].count = apiStats.diaries;
        stats.value[2].count = apiStats.projects;
        stats.value[3].count = apiStats.books;
        stats.value[4].count = apiStats.gallery;
        stats.value[5].count = apiStats.todos;

        // 获取最近文章作为活动
        try {
            const articles = await githubAPI.getArticles();
            recentActivities.value = articles.slice(0, 4).map((article) => ({
                type: "article",
                action: "更新了文章",
                title: article.title,
                time: formatRelativeTime(article.date),
            }));
        } catch {
            // 如果获取文章失败，使用空活动列表
            recentActivities.value = [];
        }
    } catch (err) {
        console.error("Failed to fetch stats:", err);
        error.value = "获取统计数据失败";
        // 出错时保持 null，表示未获取到数据
        stats.value.forEach((s) => (s.count = null));
    } finally {
        loading.value = false;
    }
}

// 格式化相对时间
function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "今天";
    if (days === 1) return "昨天";
    if (days < 7) return `${days} 天前`;
    if (days < 30) return `${Math.floor(days / 7)} 周前`;
    if (days < 365) return `${Math.floor(days / 30)} 个月前`;
    return `${Math.floor(days / 365)} 年前`;
}

// 退出开发预览模式
function exitPreviewMode() {
    localStorage.removeItem("dev_preview");
    window.location.href = "/login";
}

onMounted(() => {
    fetchStats();
});
</script>

<template>
    <div class="dashboard">
        <!-- 欢迎区域 -->
        <section class="welcome-section">
            <!-- 背景几何装饰 -->
            <div class="welcome-decor" aria-hidden="true">
                <div class="welcome-grid"></div>
                <div class="welcome-blob welcome-blob-1"></div>
                <div class="welcome-blob welcome-blob-2"></div>
                <span class="welcome-ring"></span>
                <span class="welcome-cross"></span>
            </div>
            <div class="welcome-content">
                <span class="welcome-bar" aria-hidden="true"></span>
                <h2 class="welcome-title">
                    欢迎回来，<span class="welcome-name">{{ authStore.user?.name || "Nayuki" }}</span> 👋
                </h2>
                <p class="welcome-subtitle">今天想要做些什么呢？</p>
            </div>
            <div class="welcome-actions">
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
                    写新文章
                </router-link>
            </div>
        </section>

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
                >未登录，无法获取数据。<router-link to="/login"
                    >点击登录</router-link
                ></span
            >
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
        </div>

        <!-- 统计卡片 -->
        <section class="stats-section">
            <div class="stats-grid">
                <router-link
                    v-for="stat in stats"
                    :key="stat.label"
                    :to="stat.path"
                    :class="['stat-card', `stat-card-${stat.color}`]"
                >
                    <div class="stat-icon">
                        <!-- Article -->
                        <svg
                            v-if="stat.icon === 'article'"
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path
                                d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"
                            ></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        <!-- Diary -->
                        <svg
                            v-else-if="stat.icon === 'diary'"
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path d="M12 20h9"></path>
                            <path
                                d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
                            ></path>
                        </svg>
                        <!-- Project -->
                        <svg
                            v-else-if="stat.icon === 'project'"
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path
                                d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
                            ></path>
                        </svg>
                        <!-- Book -->
                        <svg
                            v-else-if="stat.icon === 'book'"
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path
                                d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
                            ></path>
                        </svg>
                        <!-- Gallery -->
                        <svg
                            v-else-if="stat.icon === 'gallery'"
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <rect
                                x="3"
                                y="3"
                                width="18"
                                height="18"
                                rx="2"
                                ry="2"
                            ></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <!-- Todo -->
                        <svg
                            v-else-if="stat.icon === 'todo'"
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
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
                    </div>
                    <div class="stat-info">
                        <span class="stat-count" :class="{ loading: loading }">
                            {{
                                loading
                                    ? "-"
                                    : stat.count !== null
                                      ? stat.count
                                      : "--"
                            }}
                        </span>
                        <span class="stat-label">{{ stat.label }}</span>
                    </div>
                </router-link>
            </div>
        </section>

        <!-- 下方内容区 -->
        <div class="dashboard-grid">
            <!-- 快捷操作 -->
            <section class="quick-actions card">
                <h3 class="section-title">快捷操作</h3>
                <div class="actions-grid">
                    <router-link
                        v-for="action in quickActions"
                        :key="action.label"
                        :to="action.path"
                        :class="['action-btn', `action-btn-${action.color}`]"
                    >
                        <!-- Edit -->
                        <svg
                            v-if="action.icon === 'edit'"
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
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
                        <!-- Diary -->
                        <svg
                            v-else-if="action.icon === 'diary'"
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path d="M12 20h9"></path>
                            <path
                                d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
                            ></path>
                        </svg>
                        <!-- Project -->
                        <svg
                            v-else-if="action.icon === 'project'"
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path
                                d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
                            ></path>
                        </svg>
                        <!-- Tools -->
                        <svg
                            v-else-if="action.icon === 'tools'"
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path
                                d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
                            ></path>
                        </svg>
                        <span>{{ action.label }}</span>
                    </router-link>
                </div>
            </section>

            <!-- 最近活动 -->
            <section class="recent-activities card">
                <h3 class="section-title">最近活动</h3>
                <div v-if="loading" class="activities-loading">
                    <span class="spinner"></span>
                    <span>加载中...</span>
                </div>
                <div v-else-if="!authStore.token" class="activities-empty">
                    <p>登录后查看最近活动</p>
                </div>
                <div
                    v-else-if="recentActivities.length === 0"
                    class="activities-empty"
                >
                    <p>暂无最近活动</p>
                </div>
                <ul v-else class="activity-list">
                    <li
                        v-for="(activity, index) in recentActivities"
                        :key="index"
                        class="activity-item"
                    >
                        <div
                            class="activity-icon"
                            :class="`activity-icon-${activity.type}`"
                        >
                            <!-- Article -->
                            <svg
                                v-if="activity.type === 'article'"
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
                                    d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"
                                ></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                            <!-- Diary -->
                            <svg
                                v-else-if="activity.type === 'diary'"
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
                                <path d="M12 20h9"></path>
                                <path
                                    d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
                                ></path>
                            </svg>
                            <!-- Project -->
                            <svg
                                v-else-if="activity.type === 'project'"
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
                                    d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
                                ></path>
                            </svg>
                        </div>
                        <div class="activity-content">
                            <p class="activity-text">
                                <span class="activity-action">{{
                                    activity.action
                                }}</span>
                                <span class="activity-title">{{
                                    activity.title
                                }}</span>
                            </p>
                            <span class="activity-time">{{
                                activity.time
                            }}</span>
                        </div>
                    </li>
                </ul>
            </section>
        </div>
    </div>
</template>

<style scoped>
.dashboard {
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

/* 消息提示 */
.info-message,
.error-message,
.warning-message,
.preview-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    font-size: 0.875rem;
    margin-bottom: 1rem;
}

.info-message {
    background: rgba(59, 130, 246, 0.08);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #3b82f6;
}

.info-message a {
    color: #3b82f6;
    font-weight: 500;
    text-decoration: underline;
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
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    color: #10b981;
}

.preview-message a {
    color: #047857;
    font-weight: 500;
    text-decoration: underline;
}

.exit-preview-btn {
    margin-left: auto;
    padding: 0.25rem 0.75rem;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 999px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.exit-preview-btn:hover {
    background: #059669;
    transform: translateY(-1px);
}

.error-message {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
}

/* 欢迎区域 — 云白卡片 + 几何装饰 */
.welcome-section {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
    padding: 1.875rem 2rem;
    background: #ffffff;
    border: 1px solid #e3e6f0;
    border-radius: 20px;
    box-shadow: 0 1px 2px rgba(23, 25, 35, 0.04);
    overflow: hidden;
}

.welcome-decor {
    position: absolute;
    inset: 0;
    pointer-events: none;
}

/* 细线网格（右侧渐隐） */
.welcome-grid {
    position: absolute;
    inset: 0;
    background-image:
        linear-gradient(rgba(20, 22, 31, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(20, 22, 31, 0.04) 1px, transparent 1px);
    background-size: 44px 44px;
    -webkit-mask-image: linear-gradient(115deg, transparent 40%, rgba(0, 0, 0, 0.9));
    mask-image: linear-gradient(115deg, transparent 40%, rgba(0, 0, 0, 0.9));
}

/* 极光光斑 */
.welcome-blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(70px);
}

.welcome-blob-1 {
    top: -130px;
    right: -70px;
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(147, 169, 201, 0.18), transparent 70%);
}

.welcome-blob-2 {
    bottom: -150px;
    right: 20%;
    width: 260px;
    height: 260px;
    background: radial-gradient(circle, rgba(147, 169, 201, 0.12), transparent 70%);
}

/* 描边圆环 */
.welcome-ring {
    position: absolute;
    top: -48px;
    right: 26%;
    width: 130px;
    height: 130px;
    border: 1.5px solid rgba(20, 22, 31, 0.08);
    border-radius: 50%;
}

/* 十字标记 */
.welcome-cross {
    position: absolute;
    bottom: 20px;
    right: 9%;
    width: 14px;
    height: 14px;
}

.welcome-cross::before,
.welcome-cross::after {
    content: "";
    position: absolute;
    background: rgba(20, 22, 31, 0.14);
}

.welcome-cross::before {
    left: 50%;
    top: 0;
    width: 1.5px;
    height: 100%;
}

.welcome-cross::after {
    top: 50%;
    left: 0;
    width: 100%;
    height: 1.5px;
}

.welcome-content {
    position: relative;
}

/* 短杠装饰（纯色） */
.welcome-bar {
    display: block;
    width: 2.5rem;
    height: 4px;
    border-radius: 999px;
    background: #4c5670;
    opacity: 0.85;
    margin-bottom: 0.875rem;
}

.welcome-title {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #1a1d24;
    margin: 0;
}

/* 用户名（纯色文字） */
.welcome-name {
    color: #1a1d24;
}

.welcome-subtitle {
    margin: 0.5rem 0 0;
    color: #8b91a5;
    font-size: 0.9375rem;
}

.welcome-actions {
    position: relative;
}

.welcome-actions .btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.7rem 1.375rem;
    background: #4c5670;
    color: white;
    font-size: 0.9375rem;
    font-weight: 600;
    border: none;
    border-radius: 999px;
    text-decoration: none;
    box-shadow: 0 10px 24px -10px rgba(76, 86, 112, 0.35);
    transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.welcome-actions .btn:hover {
    transform: translateY(-2px);
    background: #414a61;
    box-shadow: 0 14px 32px -12px rgba(26, 29, 36, 0.24);
}

/* 统计卡片 */
.stats-section {
    margin-bottom: 2rem;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
}

.stat-card {
    position: relative;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
    background: white;
    border-radius: 18px;
    border: 1px solid #e3e6f0;
    box-shadow: 0 1px 2px rgba(23, 25, 35, 0.04);
    text-decoration: none;
    overflow: hidden;
    transition:
        transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
        border-color 0.25s cubic-bezier(0.22, 1, 0.36, 1),
        box-shadow 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.stat-card:hover {
    transform: translateY(-3px);
    border-color: #d8dce6;
    box-shadow: 0 14px 32px -14px rgba(26, 29, 36, 0.14);
}

/* 图标容器：统一中性浅底 + 雾蓝图标 */
.stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: #f2f4f8;
    color: #4c5670;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.stat-card:hover .stat-icon {
    transform: scale(1.07);
}

.stat-info {
    display: flex;
    flex-direction: column;
}

.stat-count {
    font-size: 1.75rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    color: #14161f;
    line-height: 1.2;
}

.stat-count.loading {
    opacity: 0.5;
}

.stat-label {
    font-size: 0.8125rem;
    color: #8b91a5;
}

/* 下方网格 */
.dashboard-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
}

@media (max-width: 1024px) {
    .dashboard-grid {
        grid-template-columns: 1fr;
    }
}

.card {
    background: white;
    border-radius: 16px;
    border: 1px solid #e3e6f0;
    box-shadow: 0 1px 2px rgba(23, 25, 35, 0.04);
    padding: 1.5rem;
}

/* 节标题：左侧纯色竖杠 */
.section-title {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: #14161f;
    margin: 0 0 1rem;
}

.section-title::before {
    content: "";
    width: 4px;
    height: 16px;
    border-radius: 999px;
    background: #4c5670;
    opacity: 0.85;
}

/* 快捷操作 */
.actions-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
}

.action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.875rem 1rem;
    border-radius: 12px;
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}

.action-btn:hover {
    transform: translateY(-2px);
}

/* 快捷操作按钮：统一中性浅底 + 雾蓝内容 */
.action-btn-primary,
.action-btn-purple,
.action-btn-green,
.action-btn-orange {
    background: #f2f4f8;
    color: #4c5670;
}

.action-btn-primary:hover,
.action-btn-purple:hover,
.action-btn-green:hover,
.action-btn-orange:hover {
    background: #eaeef4;
    box-shadow: 0 8px 20px -12px rgba(26, 29, 36, 0.14);
}

/* 最近活动 */
.activities-loading,
.activities-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    color: #8b91a5;
    gap: 0.5rem;
}

.activity-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.activity-item {
    display: flex;
    gap: 0.75rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid #edeff7;
}

.activity-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
}

.activity-item:first-child {
    padding-top: 0;
}

.activity-icon {
    width: 28px;
    height: 28px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.activity-icon-article,
.activity-icon-diary,
.activity-icon-project {
    background: #f2f4f8;
    color: #4c5670;
}

.activity-content {
    flex: 1;
    min-width: 0;
}

.activity-text {
    margin: 0;
    font-size: 0.875rem;
    color: #14161f;
}

.activity-action {
    color: #8b91a5;
}

.activity-title {
    font-weight: 500;
    margin-left: 0.25rem;
}

.activity-time {
    font-size: 0.75rem;
    color: #8b91a5;
}

/* Spinner */
.spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #e6e8ee;
    border-top-color: #4c5670;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* 响应式 */
@media (max-width: 768px) {
    .welcome-section {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
        text-align: left;
        padding: 1.5rem;
    }

    .welcome-title {
        font-size: 1.25rem;
    }

    .stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .actions-grid {
        grid-template-columns: 1fr;
    }
}

/* 减少动效 */
@media (prefers-reduced-motion: reduce) {
    .dashboard,
    .stat-card,
    .stat-card::before,
    .stat-icon,
    .action-btn,
    .welcome-actions .btn,
    .exit-preview-btn {
        animation: none;
        transition: none;
    }
}
</style>
