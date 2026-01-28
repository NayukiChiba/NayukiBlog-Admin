/**
 * Cloudflare Workers OAuth Proxy
 * 用于 GitHub OAuth 的 code -> access_token 交换
 */

// CORS 头部配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// 处理 OPTIONS 预检请求
function handleOptions() {
  return new Response(null, {
    headers: corsHeaders,
  })
}

// 创建 JSON 响应
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  })
}

// 创建错误响应
function errorResponse(message, status = 400) {
  return jsonResponse({ error: true, message }, status)
}

// 获取 GitHub 用户信息
async function getGitHubUser(accessToken) {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to get user info: ${response.status}`)
  }

  return response.json()
}

// 检查用户是否在白名单中
function isUserAllowed(username, env) {
  // 如果没有配置白名单，允许所有用户
  if (!env.ALLOWED_USERS) {
    return true
  }

  const allowedUsers = env.ALLOWED_USERS.split(',').map(u => u.trim().toLowerCase())
  return allowedUsers.includes(username.toLowerCase())
}

// 交换 GitHub OAuth code 获取 access_token
async function exchangeCodeForToken(code, env) {
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
async function handleCallback(request, env) {
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

    // 验证用户是否在白名单中
    const userInfo = await getGitHubUser(tokenData.access_token)
    if (!isUserAllowed(userInfo.login, env)) {
      return errorResponse(
        `用户 ${userInfo.login} 无权访问此管理面板`,
        403
      )
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

// 处理 /health 路由
function handleHealth() {
  return jsonResponse({
    status: 'ok',
    service: 'nayuki-oauth-proxy',
    timestamp: new Date().toISOString(),
  })
}

// 主入口
export default {
  async fetch(request, env, ctx) {
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
