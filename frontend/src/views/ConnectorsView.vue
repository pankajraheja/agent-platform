<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useConnectorsStore } from '../stores'
import { useAuthStore } from '../stores/auth'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const store = useConnectorsStore()
const auth = useAuthStore()
const router = useRouter()

const categoryBadge = (cat) => ({
  crm:           'bg-blue-100 text-blue-700',
  ticketing:     'bg-orange-100 text-orange-700',
  communication: 'bg-green-100 text-green-700',
  storage:       'bg-purple-100 text-purple-700',
  analytics:     'bg-indigo-100 text-indigo-700',
  custom:        'bg-gray-100 text-gray-600',
}[cat] || 'bg-gray-100 text-gray-600')

function parseAuth(val) {
  if (Array.isArray(val)) return val.map(a => a.replace('_', ' ')).join(', ')
  if (typeof val === 'string') {
    try { return JSON.parse(val).map(a => a.replace('_', ' ')).join(', ') } catch { return val }
  }
  return '—'
}

function isConnected(c) {
  return (store.instanceCounts[c.connector_id] || 0) > 0
}

onMounted(async () => {
  await store.fetchAll()
  if (auth.user?.org_id) {
    await store.fetchInstanceCounts(auth.user.org_id)
  }
})
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
            <h3 class="font-semibold text-gray-800">{{ c.name }}</h3>
            <span
              class="inline-flex items-center gap-1.5 text-xs font-medium"
              :class="isConnected(c) ? 'text-green-600' : 'text-gray-400'"
            >
              <span
                class="w-2 h-2 rounded-full"
                :class="isConnected(c) ? 'bg-green-400' : 'bg-gray-300'"
              />
              {{ isConnected(c) ? 'Connected' : 'Not Connected' }}
            </span>
          </div>
          <p class="text-xs text-gray-500 mb-3">{{ c.provider }} &middot; {{ c.type }}</p>
          <div class="flex flex-wrap gap-2">
            <span :class="['badge', categoryBadge(c.category)]">{{ c.category }}</span>
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
