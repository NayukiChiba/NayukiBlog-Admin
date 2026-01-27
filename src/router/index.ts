import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

// 开发预览模式：允许未登录状态下访问页面进行样式测试
// 在 URL 中添加 ?preview=true 或设置 localStorage.setItem('dev_preview', 'true')
function isDevPreviewMode(): boolean {
  if (typeof window === "undefined") return false;

  // 检查 URL 参数
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("preview") === "true") {
    // 同时保存到 localStorage 方便后续访问
    localStorage.setItem("dev_preview", "true");
    return true;
  }

  // 检查 localStorage
  return localStorage.getItem("dev_preview") === "true";
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/Login.vue"),
      meta: { requiresAuth: false, title: "登录" },
    },
    {
      path: "/",
      name: "dashboard",
      component: () => import("@/views/Dashboard.vue"),
      meta: { requiresAuth: true, title: "仪表盘" },
    },
    {
      path: "/articles",
      name: "articles",
      component: () => import("@/views/articles/ArticleList.vue"),
      meta: { requiresAuth: true, title: "文章管理" },
    },
    {
      path: "/articles/new",
      name: "article-new",
      component: () => import("@/views/articles/ArticleEdit.vue"),
      meta: { requiresAuth: true, title: "新建文章" },
    },
    {
      path: "/articles/:slug",
      name: "article-edit",
      component: () => import("@/views/articles/ArticleEdit.vue"),
      meta: { requiresAuth: true, title: "编辑文章" },
    },
    {
      path: "/diaries",
      name: "diaries",
      component: () => import("@/views/diaries/DiaryList.vue"),
      meta: { requiresAuth: true, title: "日记管理" },
    },
    {
      path: "/projects",
      name: "projects",
      component: () => import("@/views/projects/ProjectList.vue"),
      meta: { requiresAuth: true, title: "项目管理" },
    },
    {
      path: "/books",
      name: "books",
      component: () => import("@/views/books/BookList.vue"),
      meta: { requiresAuth: true, title: "书籍管理" },
    },
    {
      path: "/gallery",
      name: "gallery",
      component: () => import("@/views/gallery/GalleryList.vue"),
      meta: { requiresAuth: true, title: "图库管理" },
    },
    {
      path: "/todos",
      name: "todos",
      component: () => import("@/views/todos/TodoList.vue"),
      meta: { requiresAuth: true, title: "待办管理" },
    },
    {
      path: "/tools",
      name: "tools",
      component: () => import("@/views/tools/ToolList.vue"),
      meta: { requiresAuth: true, title: "工具管理" },
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      redirect: "/",
    },
  ],
});

// 路由守卫
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();

  // 设置页面标题
  document.title = to.meta.title
    ? `${to.meta.title} - Nayuki Admin`
    : "Nayuki Admin";

  // 开发预览模式：允许未登录访问所有页面
  if (isDevPreviewMode()) {
    next();
    return;
  }

  // 检查是否需要认证
  if (to.meta.requiresAuth !== false && !authStore.isAuthenticated) {
    // 未登录，重定向到登录页
    next({ name: "login", query: { redirect: to.fullPath } });
  } else if (to.name === "login" && authStore.isAuthenticated) {
    // 已登录，访问登录页时重定向到首页
    next({ name: "dashboard" });
  } else {
    next();
  }
});

// 导出开发预览模式检查函数供其他组件使用
export { isDevPreviewMode };
export default router;
