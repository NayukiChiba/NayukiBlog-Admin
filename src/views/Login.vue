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

// 本地开发构建标记（vite dev 下为 true，生产构建自动隐藏开发入口）
const isLocalDev = import.meta.env.DEV;

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
    authUrl.searchParams.set("scope", "repo user");
    authUrl.searchParams.set("state", state);

    window.location.href = authUrl.toString();
}

// 处理 OAuth 回调
async function handleOAuthCallback(code: string, state: string) {
    // 防止重复请求
    if (loading.value) {
        return;
    }

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
            const responseText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(responseText);
            } catch {
                errorData = { message: responseText };
            }
            throw new Error(errorData.message || errorData.error || "获取访问令牌失败");
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
        // 检查是否已经处理过这个 code（防止重复请求）
        const processedCode = sessionStorage.getItem("processed_oauth_code");
        if (processedCode === code) {
            window.history.replaceState({}, "", "/login");
            return;
        }

        // 标记这个 code 为已处理
        sessionStorage.setItem("processed_oauth_code", code);

        // 立即清除 URL 参数（防止刷新时重复请求）
        window.history.replaceState({}, "", "/login");

        // 处理回调
        handleOAuthCallback(code, state);
    }
});

// 开发模式直接进入（仅本地 dev 构建显示，无需 GitHub 验证）
function enterDevMode() {
    localStorage.setItem("dev_preview", "true");
    router.push("/");
}

// 进入开发预览模式
function enterPreviewMode() {
    localStorage.setItem("dev_preview", "true");
    router.push("/");
}
</script>

<template>
    <div class="login-page">
        <!-- 背景几何装饰 -->
        <div class="bg-decoration" aria-hidden="true">
            <div class="bg-grid"></div>
            <div class="bg-aurora bg-aurora-1"></div>
            <div class="bg-aurora bg-aurora-2"></div>
            <span class="bg-ring bg-ring-1"></span>
            <span class="bg-ring bg-ring-2"></span>
            <span class="bg-square"></span>
            <svg class="bg-triangle" viewBox="0 0 64 64" fill="none">
                <path
                    d="M32 8 L58 54 L6 54 Z"
                    stroke="rgba(20, 22, 31, 0.1)"
                    stroke-width="1.5"
                    stroke-linejoin="round"
                />
            </svg>
            <span class="bg-cross bg-cross-1"></span>
            <span class="bg-cross bg-cross-2"></span>
            <span class="bg-dot bg-dot-1"></span>
            <span class="bg-dot bg-dot-2"></span>
        </div>

        <!-- 登录卡片 -->
        <div class="login-card">
            <!-- Logo -->
            <div class="login-header">
                <span class="logo-mark" aria-hidden="true"></span>
                <h1 class="logo-text">Nayuki <span class="logo-thin">Admin</span></h1>
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

            <!-- 开发模式入口（仅本地 dev 构建显示，无需 GitHub 验证） -->
            <button v-if="isLocalDev" class="dev-btn" @click="enterDevMode">
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
                    <polyline points="16 18 22 12 16 6"></polyline>
                    <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
                <span>开发模式 · 直接进入</span>
                <span class="dev-badge">DEV</span>
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
            <span class="footer-mark" aria-hidden="true"></span>
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
    background: #f4f5fa;
    position: relative;
    overflow: hidden;
}

/* ===== 背景几何装饰 ===== */
.bg-decoration {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
}

/* 细线网格 */
.bg-grid {
    position: absolute;
    inset: 0;
    background-image:
        linear-gradient(rgba(20, 22, 31, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(20, 22, 31, 0.04) 1px, transparent 1px);
    background-size: 44px 44px;
    -webkit-mask-image: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.25) 75%);
    mask-image: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.25) 75%);
}

/* 极光光斑 */
.bg-aurora {
    position: absolute;
    border-radius: 50%;
    filter: blur(110px);
}

.bg-aurora-1 {
    top: -18vmax;
    right: -8vmax;
    width: 44vmax;
    height: 44vmax;
    background: radial-gradient(circle, rgba(147, 169, 201, 0.18), transparent 70%);
    animation: auroraDrift 24s ease-in-out infinite alternate;
}

.bg-aurora-2 {
    bottom: -16vmax;
    left: -10vmax;
    width: 38vmax;
    height: 38vmax;
    background: radial-gradient(circle, rgba(147, 169, 201, 0.12), transparent 70%);
    animation: auroraDrift 30s ease-in-out infinite alternate-reverse;
}

@keyframes auroraDrift {
    from { transform: translate3d(0, 0, 0) scale(1); }
    to { transform: translate3d(-6%, 8%, 0) scale(1.08); }
}

/* 描边圆环 */
.bg-ring {
    position: absolute;
    border-radius: 50%;
    border: 1.5px solid rgba(20, 22, 31, 0.08);
}

.bg-ring-1 {
    top: -120px;
    right: -100px;
    width: 380px;
    height: 380px;
    border-width: 1.5px;
    animation: slowSpinFloat 26s ease-in-out infinite alternate;
}

.bg-ring-2 {
    bottom: 8%;
    left: 6%;
    width: 150px;
    height: 150px;
    border-style: dashed;
    border-color: rgba(76, 86, 112, 0.2);
    animation: slowSpin 60s linear infinite;
}

/* 45° 方形 */
.bg-square {
    position: absolute;
    top: 22%;
    left: 12%;
    width: 68px;
    height: 68px;
    border: 1.5px solid rgba(20, 22, 31, 0.09);
    border-radius: 10px;
    transform: rotate(45deg);
    animation: floatA 20s ease-in-out infinite alternate;
}

/* 三角形 */
.bg-triangle {
    position: absolute;
    bottom: 20%;
    right: 14%;
    width: 56px;
    height: 56px;
    animation: floatB 17s ease-in-out infinite alternate;
}

/* 十字标记 */
.bg-cross {
    position: absolute;
    width: 14px;
    height: 14px;
}

.bg-cross::before,
.bg-cross::after {
    content: '';
    position: absolute;
    background: rgba(20, 22, 31, 0.16);
}

.bg-cross::before {
    left: 50%;
    top: 0;
    width: 1.5px;
    height: 100%;
}

.bg-cross::after {
    top: 50%;
    left: 0;
    width: 100%;
    height: 1.5px;
}

.bg-cross-1 { top: 16%; right: 30%; }
.bg-cross-2 { bottom: 12%; left: 32%; }

/* 主题色圆点 */
.bg-dot {
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
}

.bg-dot-1 {
    top: 40%;
    left: 7%;
    background: rgba(76, 86, 112, 0.35);
}

.bg-dot-2 {
    top: 24%;
    right: 8%;
    background: rgba(147, 169, 201, 0.6);
}

@keyframes slowSpin {
    to { transform: rotate(360deg); }
}

@keyframes slowSpinFloat {
    from { transform: translateY(0); }
    to { transform: translateY(20px); }
}

@keyframes floatA {
    from { transform: rotate(45deg) translateY(0); }
    to { transform: rotate(56deg) translateY(-14px); }
}

@keyframes floatB {
    from { transform: translateY(0) rotate(0deg); }
    to { transform: translateY(12px) rotate(-7deg); }
}

/* ===== 登录卡片 ===== */
.login-card {
    width: 100%;
    max-width: 400px;
    background: rgba(255, 255, 255, 0.86);
    backdrop-filter: blur(20px) saturate(1.5);
    -webkit-backdrop-filter: blur(20px) saturate(1.5);
    border: 1px solid rgba(255, 255, 255, 0.9);
    border-radius: 24px;
    padding: 3rem 2.5rem;
    box-shadow:
        0 1px 2px rgba(23, 25, 35, 0.04),
        0 24px 60px -16px rgba(23, 25, 35, 0.18);
    position: relative;
    z-index: 10;
    animation: slideUp 0.55s cubic-bezier(0.22, 1, 0.36, 1);
    overflow: hidden;
}


@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(24px);
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

/* 几何 Logo 标记 */
.logo-mark {
    position: relative;
    display: block;
    width: 44px;
    height: 44px;
    margin: 0 auto 1.125rem;
    border-radius: 13px;
    background: #4c5670;
    transform: rotate(45deg);
    box-shadow: 0 12px 32px -8px rgba(76, 86, 112, 0.35);
    transition: transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.logo-mark::after {
    content: '';
    position: absolute;
    inset: 13px;
    border-radius: 50%;
    background: #ffffff;
}

.login-header:hover .logo-mark {
    transform: rotate(225deg);
}

.logo-text {
    font-size: 1.75rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: #1a1d24;
    margin: 0;
}

.logo-thin {
    font-weight: 500;
    color: #93a9c9;
}

.logo-subtitle {
    font-size: 0.875rem;
    color: #8b91a5;
    margin-top: 0.5rem;
    letter-spacing: 0.06em;
}

/* 错误提示 */
.error-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 12px;
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
    background: #1b1f27;
    color: white;
    font-size: 1rem;
    font-weight: 500;
    border: none;
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.login-btn:hover:not(:disabled) {
    background: #262b38;
    transform: translateY(-2px);
    box-shadow: 0 12px 28px -10px rgba(20, 22, 31, 0.45);
}

.login-btn:active:not(:disabled) {
    transform: translateY(0);
}

.login-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

/* 开发模式按钮（渐变，仅 dev 构建显示） */
.dev-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.625rem;
    margin-top: 0.75rem;
    padding: 0.8rem 1.5rem;
    background: #4c5670;
    color: white;
    font-size: 0.9375rem;
    font-weight: 600;
    border: none;
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
    box-shadow: 0 8px 24px -10px rgba(76, 86, 112, 0.3);
}

.dev-btn:hover {
    transform: translateY(-2px);
    filter: brightness(1.06);
    box-shadow: 0 14px 32px -10px rgba(76, 86, 112, 0.35);
}

.dev-btn:active {
    transform: translateY(0);
}

.dev-badge {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    padding: 0.125rem 0.45rem;
    background: rgba(255, 255, 255, 0.22);
    border-radius: 999px;
}

/* 分隔线 */
.divider {
    display: flex;
    align-items: center;
    margin: 1.5rem 0;
    color: #8b91a5;
    font-size: 0.75rem;
}

.divider::before,
.divider::after {
    content: "";
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, #e3e6f0, transparent);
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
    color: #4e5567;
    font-size: 0.875rem;
    font-weight: 500;
    border: 1px solid #e3e6f0;
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.preview-btn:hover {
    background: #f2f4f8;
    border-color: #bcc8d9;
    color: #4c5670;
    transform: translateY(-1px);
}

.note-hint {
    color: #8b91a5;
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
    color: #8b91a5;
    text-align: center;
    line-height: 1.7;
}

/* 底部版权 */
.login-footer {
    position: absolute;
    bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #8b91a5;
    font-size: 0.75rem;
}

.login-footer p {
    margin: 0;
}

.footer-mark {
    width: 8px;
    height: 8px;
    border-radius: 2.5px;
    background: #4c5670;
    transform: rotate(45deg);
    opacity: 0.85;
}

/* 减少动效 */
@media (prefers-reduced-motion: reduce) {
    .bg-aurora-1,
    .bg-aurora-2,
    .bg-ring-1,
    .bg-ring-2,
    .bg-square,
    .bg-triangle,
    .login-card,
    .logo-mark {
        animation: none;
        transition: none;
    }
}

/* 响应式 */
@media (max-width: 480px) {
    .login-card {
        padding: 2rem 1.5rem;
        border-radius: 18px;
    }

    .logo-mark {
        width: 38px;
        height: 38px;
        border-radius: 11px;
    }

    .logo-mark::after {
        inset: 11px;
    }

    .logo-text {
        font-size: 1.5rem;
    }
}
</style>
