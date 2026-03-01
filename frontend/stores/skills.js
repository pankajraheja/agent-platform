import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api/client'

export const useSkillsStore = defineStore('skills', () => {
  // ----- State -----
  const items = ref([])
  const current = ref(null)
  const versions = ref([])
  const stats = ref(null)
  const testResult = ref(null)
  const total = ref(0)
  const loading = ref(false)
  const saving = ref(false)
  const testing = ref(false)
  const error = ref(null)

  // ----- Computed -----
  const publishedVersion = computed(() =>
    versions.value.find((v) => v.status === 'published')
  )
  const draftVersions = computed(() =>
    versions.value.filter((v) => v.status === 'draft')
  )
  const categoryCounts = computed(() => {
    const counts = {}
    items.value.forEach((s) => {
      counts[s.category] = (counts[s.category] || 0) + 1
    })
    return counts
  })

  // ----- List -----
  async function fetchAll(params = {}) {
    loading.value = true
    error.value = null
    try {
      const res = await api.get('/skills', { params })
      items.value = res.data
      total.value = res.total
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  // ----- Detail (enriched) -----
  async function fetchDetail(skillId) {
    loading.value = true
    error.value = null
    try {
      const res = await api.get(`/skills/${skillId}/detail`)
      current.value = res.data
      versions.value = res.data.versions || []
      return res.data
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  // ----- Create -----
  async function create(data) {
    saving.value = true
    error.value = null
    try {
      const res = await api.post('/skills', data)
      items.value.unshift(res.data)
      return res.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      saving.value = false
    }
  }

  // ----- Update -----
  async function update(skillId, data) {
    saving.value = true
    error.value = null
    try {
      const res = await api.put(`/skills/${skillId}`, data)
      const idx = items.value.findIndex((s) => s.skill_id === skillId)
      if (idx !== -1) items.value[idx] = res.data
      if (current.value?.skill_id === skillId) {
        current.value = { ...current.value, ...res.data }
      }
      return res.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      saving.value = false
    }
  }

  // ----- Delete -----
  async function remove(skillId) {
    saving.value = true
    try {
      await api.delete(`/skills/${skillId}`)
      items.value = items.value.filter((s) => s.skill_id !== skillId)
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      saving.value = false
    }
  }

  // ----- Duplicate -----
  async function duplicate(skillId, opts = {}) {
    saving.value = true
    try {
      const res = await api.post(`/skills/${skillId}/duplicate`, opts)
      items.value.unshift(res.data)
      return res.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      saving.value = false
    }
  }

  // ----- Versions -----
  async function createVersion(skillId, data) {
    saving.value = true
    try {
      const res = await api.post(`/skills/${skillId}/versions`, data)
      versions.value.unshift(res.data)
      return res.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      saving.value = false
    }
  }

  async function updateVersion(skillId, versionId, data) {
    saving.value = true
    try {
      const res = await api.put(`/skills/${skillId}/versions/${versionId}`, data)
      const idx = versions.value.findIndex((v) => v.skill_version_id === versionId)
      if (idx !== -1) versions.value[idx] = res.data
      return res.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      saving.value = false
    }
  }

  async function publishVersion(skillId, versionId) {
    saving.value = true
    try {
      const res = await api.post(`/skills/${skillId}/versions/${versionId}/publish`)
      // Refresh versions to get updated statuses
      await fetchDetail(skillId)
      return res.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      saving.value = false
    }
  }

  // ----- Test (Prompt Studio) -----
  async function testSkill(skillId, input, versionId = null) {
    testing.value = true
    testResult.value = null
    error.value = null
    try {
      const res = await api.post(`/skills/${skillId}/test`, {
        input,
        version_id: versionId,
      })
      testResult.value = res.data
      return res.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      testing.value = false
    }
  }

  // ----- Stats -----
  async function fetchStats(skillId) {
    try {
      const res = await api.get(`/skills/${skillId}/stats`)
      stats.value = res.data
      return res.data
    } catch (err) {
      error.value = err.message
    }
  }

  // ----- Reset -----
  function clearCurrent() {
    current.value = null
    versions.value = []
    stats.value = null
    testResult.value = null
  }

  return {
    items, current, versions, stats, testResult, total,
    loading, saving, testing, error,
    publishedVersion, draftVersions, categoryCounts,
    fetchAll, fetchDetail, create, update, remove, duplicate,
    createVersion, updateVersion, publishVersion,
    testSkill, fetchStats, clearCurrent,
  }
})
