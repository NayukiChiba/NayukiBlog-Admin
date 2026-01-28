/**
 * Cloudflare Workers OAuth Proxy
 * 用于 GitHub OAuth 的 code -> access_token 交换
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  })
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    const url = new URL(request.url)
    const path = url.pathname

    // 健康检查
    if (path === '/health' || path === '/') {
      return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() })
    }

    // OAuth 回调
    if (path === '/callback' || path === '/exchange') {
      const code = url.searchParams.get('code')
      
      if (!code) {
        return jsonResponse({ error: 'Missing code' }, 400)
      }

      try {
        // 交换 code 获取 token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
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

        if (!tokenResponse.ok) {
          return jsonResponse({ error: 'GitHub API error', status: tokenResponse.status }, 500)
        }

        const tokenData = await tokenResponse.json()

        if (tokenData.error) {
          return jsonResponse({ error: true, message: tokenData.error_description || tokenData.error }, 401)
        }

        if (!tokenData.access_token) {
          return jsonResponse({ error: 'No access token' }, 500)
        }

        // 获取用户信息
        const userResponse = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `token ${tokenData.access_token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Nayuki-Blog-Admin',
          },
        })

        if (!userResponse.ok) {
          return jsonResponse({ error: 'Failed to get user', status: userResponse.status }, 500)
        }

        const userInfo = await userResponse.json()

        // 检查白名单
        if (env.ALLOWED_USERS) {
          const allowedUsers = env.ALLOWED_USERS.split(',').map(u => u.trim().toLowerCase())
          if (!allowedUsers.includes(userInfo.login.toLowerCase())) {
            return jsonResponse({ error: `用户 ${userInfo.login} 无权访问` }, 403)
          }
        }

        return jsonResponse({
          access_token: tokenData.access_token,
          token_type: tokenData.token_type,
          scope: tokenData.scope,
        })

      } catch (err) {
        return jsonResponse({ error: err.message }, 500)
      }
    }

    return jsonResponse({ error: 'Not found' }, 404)
  },
}
