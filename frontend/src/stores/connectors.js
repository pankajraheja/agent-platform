import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../api/client'

export const useConnectorsStore = defineStore('connectors', () => {
  const items = ref([])
  const current = ref(null)
  const instances = ref([])
  const total = ref(0)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref(null)

  // instance_id -> instance count for each connector (used by list view)
  const instanceCounts = ref({})

  async function fetchAll(params = {}) {
    loading.value = true
    error.value = null
    try {
      const res = await api.get('/connectors', { params })
      items.value = res.data
      total.value = res.total
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  async function fetchInstanceCounts(orgId) {
    // Fetch instance counts for all connectors to show connection status
    const counts = {}
    await Promise.all(
      items.value.map(async (c) => {
        try {
          const res = await api.get(`/connectors/${c.connector_id}/instances`, {
            params: { org_id: orgId },
          })
          counts[c.connector_id] = res.data.filter((i) => i.status === 'active').length
        } catch {
          counts[c.connector_id] = 0
        }
      })
    )
    instanceCounts.value = counts
  }

  async function fetchDetail(id, orgId) {
    loading.value = true
    error.value = null
    try {
      const res = await api.get(`/connectors/${id}/detail`, {
        params: { org_id: orgId },
      })
      current.value = res.data
      instances.value = res.data.instances || []
      return res.data
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  async function createInstance(connectorId, data) {
    saving.value = true
    error.value = null
    try {
      const res = await api.post(`/connectors/${connectorId}/instances`, data)
      instances.value.unshift(res.data)
      return res.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      saving.value = false
    }
  }

  async function deleteInstance(connectorId, instanceId) {
    saving.value = true
    try {
      await api.delete(`/connectors/${connectorId}/instances/${instanceId}`)
      instances.value = instances.value.filter((i) => i.instance_id !== instanceId)
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      saving.value = false
    }
  }

  async function testConnection(connectorId, instanceId) {
    const res = await api.post(`/connectors/${connectorId}/instances/${instanceId}/test`)
    return res.data
  }

  async function pullData(connectorId, instanceId) {
    const res = await api.post(`/connectors/${connectorId}/instances/${instanceId}/pull`)
    return res.data
  }

  return {
    items,
    current,
    instances,
    instanceCounts,
    total,
    loading,
    saving,
    error,
    fetchAll,
    fetchInstanceCounts,
    fetchDetail,
    createInstance,
    deleteInstance,
    testConnection,
    pullData,
  }
})
