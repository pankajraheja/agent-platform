import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../api/client'

const TOKEN_KEY = 'agent_platform_token'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const persona = ref(null)
  const token = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function login(email) {
    loading.value = true
    error.value = null
    try {
      const res = await api.post('/auth/login', { email })
      token.value = res.data.token
      user.value = res.data.user
      persona.value = res.data.persona
      localStorage.setItem(TOKEN_KEY, res.data.token)
      return res.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  function logout() {
    token.value = null
    user.value = null
    persona.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  async function loadFromStorage() {
    const stored = localStorage.getItem(TOKEN_KEY)
    if (!stored) return false

    token.value = stored
    loading.value = true
    error.value = null
    try {
      const res = await api.post('/auth/me')
      user.value = res.data.user
      persona.value = res.data.persona
      return true
    } catch (err) {
      // Token expired or invalid — clear everything
      logout()
      return false
    } finally {
      loading.value = false
    }
  }

  return { user, persona, token, loading, error, login, logout, loadFromStorage }
})
