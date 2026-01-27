/**
 * Cloudflare Workers OAuth Proxy
 * 用于 GitHub OAuth 的 code -> access_token 交换
 *
 * 部署步骤：
 * 1. 安装 wrangler: npm install -g wrangler
 * 2. 登录 Cloudflare: wrangler login
 * 3. 配置 secrets:
 *    wrangler secret put GITHUB_CLIENT_ID
 *    wrangler secret put GITHUB_CLIENT_SECRET
 * 4. 部署: wrangler deploy
 */

interface Env {
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
}

interface GitHubTokenResponse {
  access_token?: string
  token_type?: string
  scope?: string
  error?: string
  error_description?: string
}

// CORS 头部配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// 处理 OPTIONS 预检请求
function handleOptions(): Response {
  return new Response(null, {
    headers: corsHeaders,
  })
}

// 创建 JSON 响应
function jsonResponse(data: object, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  })
}

// 创建错误响应
function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: true, message }, status)
}

// 交换 GitHub OAuth code 获取 access_token
async function exchangeCodeForToken(
  code: string,
  env: Env
): Promise<GitHubTokenResponse> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  })

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`)
  }

  return response.json()
}

// 处理 /callback 路由
async function handleCallback(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  if (!code) {
    return errorResponse('Missing code parameter')
  }

  try {
    const tokenData = await exchangeCodeForToken(code, env)

    if (tokenData.error) {
      return errorResponse(
        tokenData.error_description || tokenData.error,
        401
      )
    }

    if (!tokenData.access_token) {
      return errorResponse('Failed to obtain access token', 500)
    }

    return jsonResponse({
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      scope: tokenData.scope,
    })
  } catch (err) {
    console.error('Token exchange error:', err)
    return errorResponse(
      err instanceof Error ? err.message : 'Unknown error',
      500
    )
  }
}

// 处理 /health 路由（健康检查）
function handleHealth(): Response {
  return jsonResponse({
    status: 'ok',
    service: 'nayuki-oauth-proxy',
    timestamp: new Date().toISOString(),
  })
}

// 主入口
export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    // 处理 CORS 预检
    if (request.method === 'OPTIONS') {
      return handleOptions()
    }

    const url = new URL(request.url)
    const path = url.pathname

    // 路由分发
    switch (path) {
      case '/callback':
      case '/exchange':
        return handleCallback(request, env)

      case '/health':
      case '/':
        return handleHealth()

      default:
        return errorResponse('Not found', 404)
    }
  },
}
