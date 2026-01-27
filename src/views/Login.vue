<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

// 状态
const loading = ref(false);
const error = ref<string | null>(null);

// GitHub OAuth 配置
const GITHUB_CLIENT_ID =
    import.meta.env.VITE_GITHUB_CLIENT_ID || "your_client_id";
const OAUTH_PROXY_URL =
    import.meta.env.VITE_OAUTH_PROXY_URL ||
    "https://your-oauth-worker.workers.dev";

// 发起 GitHub OAuth 登录
function handleLogin() {
    loading.value = true;
    error.value = null;

    // 保存当前页面用于回调后重定向
    const redirectPath = (route.query.redirect as string) || "/";
    localStorage.setItem("oauth_redirect", redirectPath);

    // 生成随机 state 防止 CSRF
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem("oauth_state", state);

    // 跳转到 GitHub OAuth 授权页面
    const authUrl = new URL("https://github.com/login/oauth/authorize");
    authUrl.searchParams.set("client_id", GITHUB_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", `${window.location.origin}/login`);
    authUrl.searchParams.set("scope", "repo");
    authUrl.searchParams.set("state", state);

    window.location.href = authUrl.toString();
}

// 处理 OAuth 回调
async function handleOAuthCallback(code: string, state: string) {
    loading.value = true;
    error.value = null;

    try {
        // 验证 state
        const savedState = localStorage.getItem("oauth_state");
        if (state !== savedState) {
            throw new Error("无效的认证状态，请重新登录");
        }
        localStorage.removeItem("oauth_state");

        // 通过 OAuth 代理获取 access token
        const response = await fetch(
            `${OAUTH_PROXY_URL}/callback?code=${code}`,
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "获取访问令牌失败");
        }

        const data = await response.json();

        if (!data.access_token) {
            throw new Error("未获取到访问令牌");
        }

        // 保存 token 并获取用户信息
        authStore.setToken(data.access_token);
        await authStore.fetchUser();

        // 重定向到之前的页面
        const redirectPath = localStorage.getItem("oauth_redirect") || "/";
        localStorage.removeItem("oauth_redirect");
        router.push(redirectPath);
    } catch (err) {
        error.value = err instanceof Error ? err.message : "登录失败，请重试";
        console.error("OAuth callback error:", err);
    } finally {
        loading.value = false;
    }
}

// 页面加载时检查 OAuth 回调
onMounted(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");
    const errorParam = urlParams.get("error");

    if (errorParam) {
        error.value = "授权被取消或失败";
        // 清除 URL 参数
        window.history.replaceState({}, "", "/login");
        return;
    }

    if (code && state) {
        // 清除 URL 参数
        window.history.replaceState({}, "", "/login");
        handleOAuthCallback(code, state);
    }
});

// 进入开发预览模式
function enterPreviewMode() {
    localStorage.setItem("dev_preview", "true");
    router.push("/");
}
</script>

<template>
    <div class="login-page">
        <!-- 背景装饰 -->
        <div class="bg-decoration">
            <div class="bg-circle bg-circle-1"></div>
            <div class="bg-circle bg-circle-2"></div>
            <div class="bg-circle bg-circle-3"></div>
        </div>

        <!-- 登录卡片 -->
        <div class="login-card">
            <!-- Logo -->
            <div class="login-header">
                <span class="logo-icon">✨</span>
                <h1 class="logo-text">Nayuki Admin</h1>
                <p class="logo-subtitle">博客管理后台</p>
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

            <!-- 登录按钮 -->
            <button class="login-btn" :disabled="loading" @click="handleLogin">
                <template v-if="loading">
                    <span class="spinner"></span>
                    <span>登录中...</span>
                </template>
                <template v-else>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                    >
                        <path
                            d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                        />
                    </svg>
                    <span>使用 GitHub 登录</span>
                </template>
            </button>

            <!-- 分隔线 -->
            <div class="divider">
                <span>或</span>
            </div>

            <!-- 开发预览按钮 -->
            <button class="preview-btn" @click="enterPreviewMode">
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
                        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                    ></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span>进入开发预览模式</span>
            </button>

            <!-- 说明 -->
            <p class="login-note">
                使用 GitHub 账号登录后，即可管理博客内容。
                <br />
                需要对仓库有写入权限。
                <br />
                <span class="note-hint"
                    >开发预览模式仅用于测试页面样式，无法获取或保存数据。</span
                >
            </p>
        </div>

        <!-- 底部版权 -->
        <footer class="login-footer">
            <p>© 2026 Nayuki Blog. All rights reserved.</p>
        </footer>
    </div>
</template>

<style scoped>
.login-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    position: relative;
    overflow: hidden;
}

/* 背景装饰 */
.bg-decoration {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
}

.bg-circle {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
}

.bg-circle-1 {
    width: 400px;
    height: 400px;
    top: -100px;
    left: -100px;
}

.bg-circle-2 {
    width: 300px;
    height: 300px;
    bottom: -50px;
    right: -50px;
}

.bg-circle-3 {
    width: 200px;
    height: 200px;
    top: 50%;
    left: 60%;
    transform: translate(-50%, -50%);
}

/* 登录卡片 */
.login-card {
    width: 100%;
    max-width: 400px;
    background: white;
    border-radius: 1.5rem;
    padding: 3rem 2.5rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    position: relative;
    z-index: 10;
    animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.login-header {
    text-align: center;
    margin-bottom: 2rem;
}

.logo-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 0.75rem;
}

.logo-text {
    font-size: 1.75rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
}

.logo-subtitle {
    font-size: 0.875rem;
    color: #64748b;
    margin-top: 0.5rem;
}

/* 错误提示 */
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
    margin-bottom: 1.5rem;
}

/* 登录按钮 */
.login-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.875rem 1.5rem;
    background: #24292f;
    color: white;
    font-size: 1rem;
    font-weight: 500;
    border: none;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.login-btn:hover:not(:disabled) {
    background: #32383f;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.login-btn:active:not(:disabled) {
    transform: translateY(0);
}

.login-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

/* 分隔线 */
.divider {
    display: flex;
    align-items: center;
    margin: 1.5rem 0;
    color: #94a3b8;
    font-size: 0.75rem;
}

.divider::before,
.divider::after {
    content: "";
    flex: 1;
    height: 1px;
    background: #e2e8f0;
}

.divider span {
    padding: 0 1rem;
}

/* 预览按钮 */
.preview-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.75rem 1.5rem;
    background: white;
    color: #64748b;
    font-size: 0.875rem;
    font-weight: 500;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.preview-btn:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    color: #475569;
}

.note-hint {
    color: #94a3b8;
    font-style: italic;
}

.spinner {
    width: 18px;
    height: 18px;
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

/* 说明文字 */
.login-note {
    margin-top: 1.5rem;
    font-size: 0.75rem;
    color: #94a3b8;
    text-align: center;
    line-height: 1.6;
}

/* 底部版权 */
.login-footer {
    position: absolute;
    bottom: 1.5rem;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.75rem;
}

/* 响应式 */
@media (max-width: 480px) {
    .login-card {
        padding: 2rem 1.5rem;
        border-radius: 1rem;
    }

    .logo-icon {
        font-size: 2.5rem;
    }

    .logo-text {
        font-size: 1.5rem;
    }
}
</style>
