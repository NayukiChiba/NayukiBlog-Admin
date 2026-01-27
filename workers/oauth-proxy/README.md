# Nayuki OAuth Proxy

Cloudflare Workers 实现的 GitHub OAuth 代理，用于安全地交换 `code` 获取 `access_token`。

## 为什么需要 OAuth 代理？

GitHub OAuth 流程需要 `client_secret` 来交换 access token，但 `client_secret` 是敏感信息，不能暴露在前端代码中。因此需要一个后端服务（这里使用 Cloudflare Workers）来处理这个交换过程。

## 工作流程

```
┌─────────┐     ┌─────────┐     ┌─────────────┐     ┌──────────────┐
│  用户   │ --> │  前端   │ --> │ OAuth Proxy │ --> │    GitHub    │
└─────────┘     └─────────┘     └─────────────┘     └──────────────┘
     │               │                 │                    │
     │ 1. 点击登录   │                 │                    │
     │──────────────>│                 │                    │
     │               │ 2. 跳转到 GitHub│                    │
     │               │─────────────────────────────────────>│
     │               │                 │                    │
     │               │<────────────────────────────────────│
     │               │ 3. 返回 code    │                    │
     │               │                 │                    │
     │               │ 4. 发送 code    │                    │
     │               │────────────────>│                    │
     │               │                 │ 5. 交换 token      │
     │               │                 │───────────────────>│
     │               │                 │<───────────────────│
     │               │<────────────────│ 6. 返回 token      │
     │               │ 7. 保存 token   │                    │
     │<──────────────│                 │                    │
     │ 8. 登录成功   │                 │                    │
```

## 部署步骤

### 1. 创建 GitHub OAuth App

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击 "New OAuth App"
3. 填写信息：
   - **Application name**: Nayuki Blog Admin
   - **Homepage URL**: `https://your-admin-domain.com`
   - **Authorization callback URL**: `https://your-admin-domain.com/login`
4. 创建后，记录 `Client ID` 和 `Client Secret`

### 2. 安装 Wrangler

```bash
npm install -g wrangler
```

### 3. 登录 Cloudflare

```bash
wrangler login
```

### 4. 配置 Secrets

在 `workers/oauth-proxy` 目录下执行：

```bash
# 设置 Client ID
wrangler secret put GITHUB_CLIENT_ID
# 输入你的 GitHub OAuth App Client ID

# 设置 Client Secret
wrangler secret put GITHUB_CLIENT_SECRET
# 输入你的 GitHub OAuth App Client Secret
```

### 5. 部署 Worker

```bash
# 安装依赖
npm install

# 部署
npm run deploy
```

部署成功后会显示 Worker URL，例如：
```
https://nayuki-oauth-proxy.your-username.workers.dev
```

### 6. 配置前端环境变量

在 Admin 项目根目录创建或编辑 `.env` 文件：

```env
VITE_GITHUB_CLIENT_ID=your_github_client_id
VITE_GITHUB_OWNER=NayukiChiba
VITE_GITHUB_REPO=NayukiBlog
VITE_GITHUB_BRANCH=static-blog
VITE_OAUTH_PROXY_URL=https://nayuki-oauth-proxy.your-username.workers.dev
```

## API 接口

### GET /callback

交换 GitHub OAuth code 获取 access token。

**请求参数：**
- `code` (string, required): GitHub OAuth 返回的授权码

**成功响应：**
```json
{
  "access_token": "gho_xxxxxxxxxxxx",
  "token_type": "bearer",
  "scope": "repo"
}
```

**错误响应：**
```json
{
  "error": true,
  "message": "Missing code parameter"
}
```

### GET /health

健康检查接口。

**响应：**
```json
{
  "status": "ok",
  "service": "nayuki-oauth-proxy",
  "timestamp": "2026-01-28T12:00:00.000Z"
}
```

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

开发服务器默认运行在 `http://localhost:8787`

## 安全说明

1. `GITHUB_CLIENT_SECRET` 通过 Cloudflare Secrets 安全存储，不会出现在代码中
2. Worker 支持 CORS，允许跨域请求
3. 建议在 GitHub OAuth App 设置中限制回调 URL 到你的域名
4. 生产环境建议配置自定义域名并启用 HTTPS

## 故障排除

### "Missing code parameter" 错误
确保前端正确传递了 `code` 参数。

### "bad_verification_code" 错误
- GitHub OAuth code 只能使用一次
- code 在 10 分钟后过期
- 确保 `client_id` 和 `client_secret` 正确

### CORS 错误
确保 Worker 正确部署，且 URL 配置正确。

## 许可证

MIT