// ============================================================
// Store Factory — Generates Pinia CRUD stores for any entity
// Usage: export const useAgentsStore = createCrudStore('agents', '/agents')
// ============================================================

import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../api/client'

export function createCrudStore(name, endpoint) {
  return defineStore(name, () => {
    const items = ref([])
    const current = ref(null)
    const total = ref(0)
    const loading = ref(false)
    const error = ref(null)

    async function fetchAll(params = {}) {
      loading.value = true
      error.value = null
      try {
        const res = await api.get(endpoint, { params })
        items.value = res.data
        total.value = res.total
      } catch (err) {
        error.value = err.message
      } finally {
        loading.value = false
      }
    }

    async function fetchById(id) {
      loading.value = true
      error.value = null
      try {
        const res = await api.get(`${endpoint}/${id}`)
        current.value = res.data
        return res.data
      } catch (err) {
        error.value = err.message
      } finally {
        loading.value = false
      }
    }

    async function create(data) {
      loading.value = true
      error.value = null
      try {
        const res = await api.post(endpoint, data)
        items.value.unshift(res.data)
        return res.data
      } catch (err) {
        error.value = err.message
        throw err
      } finally {
        loading.value = false
      }
    }

    async function update(id, data) {
      loading.value = true
      error.value = null
      try {
        const res = await api.put(`${endpoint}/${id}`, data)
        const idx = items.value.findIndex((i) => Object.values(i)[0] === id)
        if (idx !== -1) items.value[idx] = res.data
        return res.data
      } catch (err) {
        error.value = err.message
        throw err
      } finally {
        loading.value = false
      }
    }

    async function remove(id) {
      loading.value = true
      error.value = null
      try {
        await api.delete(`${endpoint}/${id}`)
        items.value = items.value.filter((i) => Object.values(i)[0] !== id)
      } catch (err) {
        error.value = err.message
        throw err
      } finally {
        loading.value = false
      }
    }

    return { items, current, total, loading, error, fetchAll, fetchById, create, update, remove }
  })
}
