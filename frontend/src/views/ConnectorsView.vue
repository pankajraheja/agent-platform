<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useConnectorsStore } from '../stores'
import { useAuthStore } from '../stores/auth'
import SkeletonLoader from '../components/SkeletonLoader.vue'
import api from '../api/client'

const store = useConnectorsStore()
const auth = useAuthStore()
const router = useRouter()

const instanceMap = ref({})

onMounted(async () => {
  await store.fetchAll()
  // Fetch all instances for the user's org to determine which connectors are "connected"
  if (auth.user?.org_id) {
    try {
      const res = await api.get('/connectors', { params: { limit: 200 } })
      // For each connector, check if there are instances
      for (const c of store.items) {
        try {
          const instRes = await api.get(`/connectors/${c.connector_id}/instances`, {
            params: { org_id: auth.user.org_id }
          })
          if (instRes.data?.length) {
            instanceMap.value[c.connector_id] = instRes.data.length
          }
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }
})

function parseAuth(val) {
  if (Array.isArray(val)) return val.join(', ')
  if (typeof val === 'string') {
    try { return JSON.parse(val).join(', ') } catch { return val }
  }
  return '—'
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <p class="text-sm text-gray-500">{{ store.items.length }} connectors available</p>
    </div>

    <div v-if="store.loading" class="py-4">
      <SkeletonLoader type="card" :lines="6" />
    </div>

    <div v-else-if="store.items.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="c in store.items"
        :key="c.connector_id"
        class="card hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between"
        @click="router.push(`/connectors/${c.connector_id}`)"
      >
        <div>
          <div class="flex items-start justify-between mb-2">
            <h3 class="font-semibold text-sm">{{ c.name }}</h3>
            <span v-if="instanceMap[c.connector_id]" class="text-green-500 text-sm" title="Connected">
              ✓ Connected
            </span>
          </div>
          <p class="text-xs text-gray-500 mb-3">{{ c.provider }}</p>
          <div class="flex flex-wrap gap-2">
            <span class="badge bg-purple-100 text-purple-700">{{ c.category }}</span>
            <span class="badge bg-gray-100 text-gray-600">{{ c.type }}</span>
          </div>
        </div>
        <div class="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
          Auth: {{ parseAuth(c.auth_methods) }}
        </div>
      </div>
    </div>

    <div v-else class="card text-center py-16">
      <p class="text-4xl mb-3">🔌</p>
      <p class="text-gray-500 font-medium">No connectors configured yet</p>
      <p class="text-xs text-gray-400 mt-1">Connectors let your agents interact with external services</p>
    </div>
  </div>
</template>
