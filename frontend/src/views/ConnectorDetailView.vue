<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'
import SkeletonLoader from '../components/SkeletonLoader.vue'
import api from '../api/client'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { showToast } = useToast()
const connectorId = route.params.id

const connector = ref(null)
const instances = ref([])
const loading = ref(true)

// New connection modal
const showModal = ref(false)
const form = ref({ name: '', connection_config: '{}' })
const creating = ref(false)
const formError = ref('')

function parseAuth(val) {
  if (Array.isArray(val)) return val.join(', ')
  if (typeof val === 'string') {
    try { return JSON.parse(val).join(', ') } catch { return val }
  }
  return '—'
}

const statusColor = (status) => ({
  active: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
  revoked: 'bg-gray-100 text-gray-600',
}[status] || 'bg-gray-100 text-gray-600')

async function fetchData() {
  loading.value = true
  try {
    const [connRes, instRes] = await Promise.all([
      api.get(`/connectors/${connectorId}`),
      api.get(`/connectors/${connectorId}/instances`, { params: { org_id: auth.user?.org_id } }),
    ])
    connector.value = connRes.data
    instances.value = instRes.data
  } catch (err) {
    console.error('Load failed:', err)
  } finally {
    loading.value = false
  }
}

async function createInstance() {
  formError.value = ''
  let parsedConfig = {}
  try {
    parsedConfig = JSON.parse(form.value.connection_config)
  } catch {
    formError.value = 'Invalid JSON in config field'
    return
  }

  creating.value = true
  try {
    await api.post(`/connectors/${connectorId}/instances`, {
      org_id: auth.user.org_id,
      name: form.value.name,
      connection_config: parsedConfig,
      status: 'active',
    })
    showModal.value = false
    form.value = { name: '', connection_config: '{}' }
    const instRes = await api.get(`/connectors/${connectorId}/instances`, { params: { org_id: auth.user?.org_id } })
    instances.value = instRes.data
    showToast(`Connected "${connector.value.name}" successfully`, 'success')
  } catch (err) {
    formError.value = err.message || 'Failed to create connection'
  } finally {
    creating.value = false
  }
}

async function disconnectInstance(instance) {
  try {
    await api.delete(`/connectors/${connectorId}/instances/${instance.instance_id}`)
    instances.value = instances.value.filter(i => i.instance_id !== instance.instance_id)
    showToast(`Disconnected "${instance.name}"`, 'info')
  } catch (err) {
    console.error('Disconnect failed:', err)
    showToast('Failed to disconnect', 'error')
  }
}

onMounted(fetchData)
</script>

<template>
  <div v-if="loading" class="space-y-6">
    <SkeletonLoader type="list" :lines="1" />
    <SkeletonLoader type="table" :lines="3" />
  </div>

  <div v-else-if="!connector" class="text-center py-20">
    <p class="text-4xl mb-3">🔌</p>
    <p class="text-gray-500 font-medium">Connector not found</p>
    <button class="btn-primary text-sm mt-4" @click="router.push('/connectors')">Back to Connectors</button>
  </div>

  <div v-else class="space-y-6">
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-1.5 text-sm">
      <router-link to="/connectors" class="text-gray-400 hover:text-brand-600 transition-colors">Connectors</router-link>
      <span class="text-gray-300">/</span>
      <span class="text-gray-700 font-medium">{{ connector.name }}</span>
    </nav>

    <!-- Header -->
    <h1 class="text-xl font-bold text-gray-800">{{ connector.name }}</h1>

    <!-- Connector Info -->
    <div class="card">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p class="text-xs text-gray-400">Provider</p>
          <p class="text-sm font-medium">{{ connector.provider }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-400">Category</p>
          <span class="badge bg-purple-100 text-purple-700">{{ connector.category }}</span>
        </div>
        <div>
          <p class="text-xs text-gray-400">Type</p>
          <span class="badge bg-gray-100 text-gray-600">{{ connector.type }}</span>
        </div>
        <div>
          <p class="text-xs text-gray-400">Auth Methods</p>
          <p class="text-sm">{{ parseAuth(connector.auth_methods) }}</p>
        </div>
      </div>
    </div>

    <!-- Connections -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold">Connections</h2>
        <button class="btn-primary text-sm" @click="showModal = true">+ New Connection</button>
      </div>

      <div v-if="instances.length" class="divide-y divide-gray-100">
        <div
          v-for="inst in instances"
          :key="inst.instance_id"
          class="flex items-center justify-between py-3"
        >
          <div>
            <p class="text-sm font-medium">{{ inst.name }}</p>
            <p class="text-xs text-gray-400">Created {{ new Date(inst.created_at).toLocaleDateString() }}</p>
          </div>
          <div class="flex items-center gap-3">
            <span :class="['badge', statusColor(inst.status)]">{{ inst.status }}</span>
            <button
              class="text-xs text-red-500 hover:text-red-700"
              @click="disconnectInstance(inst)"
            >Disconnect</button>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-8">
        <p class="text-2xl mb-2">🔗</p>
        <p class="text-sm text-gray-400">No active connections</p>
        <p class="text-xs text-gray-400 mt-1">Click "New Connection" to get started</p>
      </div>
    </div>
  </div>

  <!-- New Connection Modal -->
  <Teleport to="body">
    <div v-if="showModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="showModal = false">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div class="flex items-center justify-between px-6 py-4 border-b">
          <h3 class="font-semibold">New Connection — {{ connector.name }}</h3>
          <button class="text-gray-400 hover:text-gray-600" @click="showModal = false">&times;</button>
        </div>
        <form @submit.prevent="createInstance" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Connection Name</label>
            <input
              v-model="form.name"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Production Salesforce"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Config (JSON)</label>
            <textarea
              v-model="form.connection_config"
              rows="4"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder='{ "api_key": "..." }'
            />
          </div>

          <div v-if="formError" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {{ formError }}
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button type="button" class="btn-secondary text-sm" @click="showModal = false">Cancel</button>
            <button type="submit" class="btn-primary text-sm" :disabled="creating || !form.name">
              {{ creating ? 'Connecting...' : 'Connect' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
