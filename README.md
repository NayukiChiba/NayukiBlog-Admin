# NayukiBlog Admin

基于 Vue 3 + TypeScript 的博客管理后台，通过 GitHub API 直接管理博客内容。

## 功能

- 📝 文章管理 - Markdown 编辑器，实时预览
- 📔 日记管理 - 时间线展示，支持图片
- 📋 待办管理 - 短期/中期/长期目标分类
- 🔧 工具管理 - 收藏常用工具和资源
- 📚 书籍管理 - 记录阅读进度
- 🖼️ 图库管理 - 管理博客图片
- 🚀 项目管理 - 展示个人项目
- 🔐 GitHub OAuth - 安全认证，用户白名单

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
VITE_GITHUB_CLIENT_ID=你的_Client_ID
VITE_GITHUB_OWNER=你的_GitHub_用户名
VITE_GITHUB_REPO=你的_仓库名
VITE_GITHUB_BRANCH=分支名
VITE_OAUTH_PROXY_URL=你的_Worker_URL
```

### 3. 部署 OAuth 代理

```bash
cd workers/oauth-proxy
npm install

# 配置 Secrets
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put ALLOWED_USERS  # 例如: user1,user2

# 部署
npm run deploy
```

### 4. 启动开发

```bash
npm run dev
```

## OAuth 配置详解

### 创建 GitHub OAuth App

1. 访问 https://github.com/settings/developers
2. 点击 "New OAuth App"
3. 填写信息：
   - Application name: `NayukiBlog Admin`
   - Homepage URL: `https://your-domain.com`
   - Callback URL: `https://your-domain.com/login`
4. 获取 Client ID 和 Client Secret

### 部署 Cloudflare Worker

Worker 用于安全地处理 OAuth 流程（避免在前端暴露 Client Secret）。

**配置 Secrets：**

```bash
cd workers/oauth-proxy

# GitHub OAuth 凭证
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET

# 用户白名单（推荐配置）
wrangler secret put ALLOWED_USERS
# 输入允许访问的 GitHub 用户名，多个用户用逗号分隔
# 例如: NayukiMeko,user2
```

**部署：**

```bash
npm run deploy
```

部署成功后会得到 Worker URL，填入 `.env` 的 `VITE_OAUTH_PROXY_URL`。

### 用户白名单

配置 `ALLOWED_USERS` 后，只有白名单中的 GitHub 用户可以登录管理面板。

- 不配置：允许所有 GitHub 用户登录
- 配置后：只有指定用户可以访问
- 格式：用逗号分隔，例如 `user1,user2,user3`
- 不区分大小写

## 项目结构

```
NayukiBlog-Admin/
├── src/
│   ├── api/              # GitHub API 封装
│   ├── components/       # 组件
│   ├── views/            # 页面
│   ├── stores/           # 状态管理
│   ├── router/           # 路由
│   └── styles/           # 样式
├── workers/
│   └── oauth-proxy/      # OAuth 代理
├── .env                  # 环境变量（不提交）
└── README.md
```

## 开发预览模式

无需登录即可预览界面：

- 访问 `http://localhost:5173?preview=true`
- 或在登录页点击 "进入开发预览模式"

注意：预览模式下无法获取或保存真实数据。

## 构建部署

```bash
npm run build
```

构建产物在 `dist/` 目录，可部署到任何静态托管服务。

## 常见问题

**Q: 登录后提示 "用户无权访问"？**  
A: 检查 Worker 的 `ALLOWED_USERS` Secret 是否包含你的 GitHub 用户名。

**Q: 中文显示乱码？**  
A: 已修复 UTF-8 编码问题，清除浏览器缓存后重试。

**Q: OAuth 代理返回错误？**  
A: 检查 Worker Secrets 是否正确配置，使用 `wrangler secret list` 查看。

## 技术栈

- Vue 3 + TypeScript
- Vite
- Pinia (状态管理)
- Vue Router
- Tailwind CSS
- Octokit (GitHub API)
- Cloudflare Workers

## 许可证

MIT
