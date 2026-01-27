# NayukiBlog Admin

NayukiBlog 的后台管理系统，基于 Vue 3 + TypeScript 构建，通过 GitHub API 直接管理博客内容。

## ✨ 功能特性

- 📝 **文章管理** - Markdown 编辑器，支持实时预览
- 📔 **日记管理** - 时间线展示，支持图片（最多 2 张）
- 📋 **待办管理** - 支持短期/中期/长期目标分类
- 🔧 **工具收藏** - 按分类管理常用工具和资源
- 📚 **书籍管理** - 记录阅读进度和书评
- 🖼️ **图库管理** - 管理博客图片资源
- 🚀 **项目展示** - 管理个人项目列表
- 🔐 **GitHub OAuth** - 安全的身份认证
- 👀 **开发预览模式** - 无需登录即可预览界面

## 🛠️ 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue 3 | ^3.4 | 前端框架 |
| TypeScript | ~5.4 | 类型安全 |
| Vite | ^5.2 | 构建工具 |
| Vue Router | ^4.3 | 路由管理 |
| Pinia | ^2.1 | 状态管理 |
| Tailwind CSS | ^3.4 | 样式框架 |
| Octokit | ^20.0 | GitHub API |

## 📁 项目结构

```
NayukiBlog-Admin/
├── src/
│   ├── api/                 # API 层
│   │   └── github.ts        # GitHub API 封装 (Octokit)
│   ├── components/          # 组件
│   │   └── layout/          # 布局组件
│   ├── views/               # 页面
│   │   ├── Login.vue        # 登录页
│   │   ├── Dashboard.vue    # 仪表盘
│   │   ├── articles/        # 文章管理
│   │   ├── diaries/         # 日记管理
│   │   ├── todos/           # 待办管理
│   │   ├── tools/           # 工具管理
│   │   ├── books/           # 书籍管理
│   │   ├── gallery/         # 图库管理
│   │   └── projects/        # 项目管理
│   ├── stores/              # Pinia 状态管理
│   ├── router/              # 路由配置
│   └── styles/              # 全局样式
├── workers/                 # Cloudflare Workers
│   └── oauth-proxy/         # OAuth 代理服务
├── public/                  # 静态资源
├── env.example              # 环境变量示例
└── index.html               # HTML 入口
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `env.example` 为 `.env` 并填写配置：

```env
VITE_GITHUB_CLIENT_ID=你的_GitHub_OAuth_Client_ID
VITE_GITHUB_OWNER=你的_GitHub_用户名
VITE_GITHUB_REPO=你的_博客仓库名
VITE_GITHUB_BRANCH=博客分支名
VITE_OAUTH_PROXY_URL=你的_OAuth_代理_URL
```

### 3. 启动开发服务器

```bash
npm run dev
```

### 4. 构建生产版本

```bash
npm run build
```

## 🔐 OAuth 配置指南

### 步骤 1：创建 GitHub OAuth App

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击 **"New OAuth App"**
3. 填写表单：
   - **Application name**: `NayukiBlog Admin`
   - **Homepage URL**: `http://localhost:5173`（开发）或你的生产域名
   - **Authorization callback URL**: `http://localhost:5173/login`
4. 点击 **"Register application"**
5. 复制 **Client ID**，并生成 **Client Secret**

### 步骤 2：部署 OAuth 代理

OAuth 代理用于安全地交换 access_token（避免在前端暴露 client_secret）。

```bash
# 进入 worker 目录
cd workers/oauth-proxy

# 安装依赖
npm install

# 登录 Cloudflare
npx wrangler login

# 配置 secrets
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET

# 部署
npx wrangler deploy
```

部署成功后会得到 Worker URL，填入 `.env` 的 `VITE_OAUTH_PROXY_URL`。

### 步骤 3：测试登录

1. 启动开发服务器 `npm run dev`
2. 访问 http://localhost:5173
3. 点击 **"使用 GitHub 登录"**
4. 授权后自动跳转回管理后台

## 👀 开发预览模式

无需配置 OAuth 即可预览界面样式：

- 访问 `http://localhost:5173?preview=true`
- 或在登录页点击 **"进入开发预览模式"**

> 注意：预览模式下无法获取或保存真实数据

## 📝 数据格式说明

### Todo 图标

Todo 和 Tool 的 `icon` 字段支持 SVG 代码，例如：

```json
{
  "id": 1,
  "task": "完成博客开发",
  "icon": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M12 2L2 7l10 5 10-5-10-5z'/></svg>",
  "completed": false,
  "priority": "high",
  "type": "short-term",
  "progress": 50
}
```

## ❓ 常见问题

### Q: 登录后提示 "Invalid state"？
清除浏览器 localStorage 后重试。

### Q: OAuth 代理返回错误？
检查 Worker 的 secrets 是否正确配置。

### Q: 无法获取/保存数据？
确保 GitHub OAuth App 的 scope 包含 `repo`，且对目标仓库有写入权限。

### Q: 如何退出开发预览模式？
点击页面上的 "退出预览" 按钮。

## 📄 许可证

MIT License