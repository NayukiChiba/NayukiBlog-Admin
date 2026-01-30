# Blog Admin

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

---

## 本地开发

### 1. 创建 GitHub OAuth App

1. 访问 https://github.com/settings/developers
2. 点击 "New OAuth App"
3. 配置：
   - Application name: `Your Blog Admin (Dev)`
   - Homepage URL: `http://localhost:5173`
   - Callback URL: `http://localhost:5173/login`
4. 保存 **Client ID** 和 **Client Secret**

### 2. 部署 Cloudflare Worker

```bash
cd workers/oauth-proxy
npm install

# 配置 Secrets（命令行会提示输入值）
wrangler secret put GITHUB_CLIENT_ID      # 输入上一步的 Client ID
wrangler secret put GITHUB_CLIENT_SECRET  # 输入上一步的 Client Secret
wrangler secret put ALLOWED_USERS         # 输入允许登录的 GitHub 用户名

npm run deploy
```

部署成功后记录 Worker URL（如 `https://xxx.workers.dev`）

### 3. 配置 `.env` 文件

在项目根目录创建 `.env` 文件（已在 `.gitignore` 中，不会提交）：

```env
VITE_GITHUB_CLIENT_ID=你的_Client_ID
VITE_GITHUB_OWNER=你的_GitHub_用户名
VITE_GITHUB_REPO=你的_博客仓库名
VITE_GITHUB_BRANCH=main
VITE_OAUTH_PROXY_URL=https://你的worker.workers.dev
```

### 4. 启动开发服务器

```bash
npm install
npm run dev
```

访问 http://localhost:5173

---

## 生产环境部署（EdgeOne）

### 架构说明

```
┌─────────────────────────────────────────────────────────────┐
│                    EdgeOne Pages                             │
│  (前端托管，只需要 CLIENT_ID，不需要 SECRET)                 │
│  环境变量: VITE_GITHUB_CLIENT_ID, VITE_OAUTH_PROXY_URL      │
└────────────────────────┬────────────────────────────────────┘
                         │ 调用
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               Cloudflare Worker                              │
│  (OAuth 代理，安全存储 CLIENT_SECRET)                        │
│  Secrets: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET             │
└─────────────────────────────────────────────────────────────┘
```

> 💡 CF Worker 和 EdgeOne 使用**同一个** GitHub OAuth App 的凭证。

### 1. 创建生产环境 GitHub OAuth App

1. 访问 https://github.com/settings/developers
2. 创建一个**新的** OAuth App（与本地开发的分开）
3. 配置：
   - Application name: `Your Blog Admin`
   - Homepage URL: `https://admin.your-domain.com`
   - Callback URL: `https://admin.your-domain.com/login`
4. 保存 **Client ID** 和 **Client Secret**

### 2. 更新 Cloudflare Worker

```bash
cd workers/oauth-proxy

# 用生产环境凭证覆盖
wrangler secret put GITHUB_CLIENT_ID      # 输入生产 Client ID
wrangler secret put GITHUB_CLIENT_SECRET  # 输入生产 Client Secret

npm run deploy
```

### 3. 在 EdgeOne 配置环境变量

登录 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone) → Pages 项目 → 设置 → 环境变量：

| 环境变量                | 值                                |
| ----------------------- | --------------------------------- |
| `VITE_GITHUB_CLIENT_ID` | 生产环境 OAuth App 的 Client ID   |
| `VITE_OAUTH_PROXY_URL`  | `https://your-worker.workers.dev` |
| `VITE_GITHUB_OWNER`     | 你的 GitHub 用户名                |
| `VITE_GITHUB_REPO`      | 你的博客仓库名                    |
| `VITE_GITHUB_BRANCH`    | `main`                            |

### 4. 部署到 EdgeOne

1. 在 EdgeOne 控制台创建 Pages 项目
2. 关联 GitHub 仓库
3. 配置构建设置：
   - 构建命令: `npm run build`
   - 输出目录: `dist`
   - Node.js 版本: `18`
4. 添加环境变量
5. 点击部署

### 5. 配置域名

1. 在 EdgeOne 添加自定义域名
2. 配置 DNS 解析指向 EdgeOne
3. 确保 HTTPS 已启用

---

## 环境变量参考

| 变量名                  | 必填 | 说明                   |
| ----------------------- | ---- | ---------------------- |
| `VITE_GITHUB_CLIENT_ID` | ✅   | GitHub OAuth Client ID |
| `VITE_OAUTH_PROXY_URL`  | ✅   | OAuth Worker 代理地址  |
| `VITE_GITHUB_OWNER`     | ✅   | GitHub 仓库拥有者      |
| `VITE_GITHUB_REPO`      | ✅   | GitHub 仓库名          |
| `VITE_GITHUB_BRANCH`    | ❌   | Git 分支（默认 main）  |

---

## 开发预览模式

无需登录即可预览界面：

- 访问 `http://localhost:5173?preview=true`
- 或在登录页点击 "进入开发预览模式"

---

## 常见问题

**Q: 登录后提示 "用户无权访问"？**  
A: 检查 Worker 的 `ALLOWED_USERS` Secret 是否包含你的 GitHub 用户名。

**Q: OAuth 代理返回错误？**  
A: 检查 Worker Secrets 是否正确配置，使用 `wrangler secret list` 查看。

---

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
