import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface User {
  login: string
  avatar_url: string
  name: string
  html_url: string
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref<string | null>(localStorage.getItem('github_token'))
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const isAuthenticated = computed(() => !!token.value)

  // Actions
  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem('github_token', newToken)
  }

  function setUser(newUser: User) {
    user.value = newUser
  }

  function setLoading(state: boolean) {
    loading.value = state
  }

  function setError(message: string | null) {
    error.value = message
  }

  async function fetchUser() {
    if (!token.value) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token.value}`,
          Accept: 'application/vnd.github.v3+json'
        }
      })

      if (!response.ok) {
        throw new Error('获取用户信息失败')
      }

      const userData = await response.json()
      setUser({
        login: userData.login,
        avatar_url: userData.avatar_url,
        name: userData.name || userData.login,
        html_url: userData.html_url
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
      logout()
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('github_token')
  }

  // 初始化时如果有 token，自动获取用户信息
  async function init() {
    if (token.value) {
      await fetchUser()
    }
  }

  return {
    // State
    token,
    user,
    loading,
    error,
    // Getters
    isAuthenticated,
    // Actions
    setToken,
    setUser,
    setLoading,
    setError,
    fetchUser,
    logout,
    init
  }
})
