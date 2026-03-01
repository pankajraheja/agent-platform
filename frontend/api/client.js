// ============================================================
// API Client — Axios instance with base config
// Vite proxies /api → http://localhost:3000 in dev
// ============================================================

import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// Response interceptor: unwrap { data: ... } envelope
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error?.message || error.message
    console.error('API Error:', message)
    return Promise.reject(new Error(message))
  }
)

export default api
