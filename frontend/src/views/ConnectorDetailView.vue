<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useConnectorsStore } from '../stores'
import { useToast } from '../composables/useToast'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const store = useConnectorsStore()
const { showToast } = useToast()
const connectorId = route.params.id

const loading = ref(true)
const connector = ref(null)
const creating = ref(false)

// Dynamic form data (populated from config_schema fields)
const formData = ref({})
const formError = ref('')

// Fallback JSON form
const fallbackJson = ref('{}')

// Test results per instance
const testResults = ref({})
const testing = ref({})

// Pull data
const pullResults = ref({})
const pulling = ref({})
const showPullModal = ref(false)
const activePullInstanceId = ref(null)

// Confirm disconnect
const confirmDisconnectId = ref(null)

const categoryBadge = (cat) => ({
  crm:           'bg-blue-100 text-blue-700',
  ticketing:     'bg-orange-100 text-orange-700',
  communication: 'bg-green-100 text-green-700',
  storage:       'bg-purple-100 text-purple-700',
  analytics:     'bg-indigo-100 text-indigo-700',
  custom:        'bg-gray-100 text-gray-600',
}[cat] || 'bg-gray-100 text-gray-600')

const statusDot = (status) => ({
  active:  'bg-green-400',
  error:   'bg-red-400',
  revoked: 'bg-gray-400',
}[status] || 'bg-gray-400')

function parseAuth(val) {
  if (Array.isArray(val)) return val.map(a => a.replace('_', ' ')).join(', ')
  if (typeof val === 'string') {
    try { return JSON.parse(val).map(a => a.replace('_', ' ')).join(', ') } catch { return val }
  }
  return '—'
}

const hasConfigSchema = computed(() => {
  const schema = connector.value?.config_schema
  return schema && schema.fields && schema.fields.length > 0
})

const isSalesforce = computed(() => {
  return connector.value?.name?.toLowerCase().includes('salesforce')
})

function initFormData() {
  if (hasConfigSchema.value) {
    const data = {}
    for (const field of connector.value.config_schema.fields) {
      data[field.name] = field.default !== undefined ? field.default : (field.type === 'boolean' ? false : '')
    }
    formData.value = data
  }
}

async function fetchData() {
  loading.value = true
  try {
    const data = await store.fetchDetail(connectorId, auth.user?.org_id)
    connector.value = data
    initFormData()
  } catch (err) {
    console.error('Load failed:', err)
  } finally {
    loading.value = false
  }
}

async function createInstance() {
  formError.value = ''
  creating.value = true

  let config = {}
  let credentials = {}

  if (hasConfigSchema.value) {
    for (const field of connector.value.config_schema.fields) {
      if (field.required && !formData.value[field.name]) {
        formError.value = `${field.label} is required`
        creating.value = false
        return
      }
    }
    for (const field of connector.value.config_schema.fields) {
      if (field.type === 'password') {
        credentials[field.name] = formData.value[field.name]
      } else {
        config[field.name] = formData.value[field.name]
      }
    }
  } else {
    try {
      config = JSON.parse(fallbackJson.value)
    } catch {
      formError.value = 'Invalid JSON'
      creating.value = false
      return
    }
  }

  try {
    await store.createInstance(connectorId, {
      org_id: auth.user.org_id,
      name: `${connector.value.name} Connection`,
      connection_config: config,
      credentials_ref: JSON.stringify(credentials),
      status: 'active',
    })
    showToast(`Connected to ${connector.value.name} successfully`, 'success')
    initFormData()
    fallbackJson.value = '{}'
  } catch (err) {
    formError.value = err.message || 'Failed to create connection'
    showToast('Connection failed', 'error')
  } finally {
    creating.value = false
  }
}

async function testConnection(inst) {
  testing.value = { ...testing.value, [inst.instance_id]: true }
  testResults.value = { ...testResults.value, [inst.instance_id]: null }
  try {
    const result = await store.testConnection(connectorId, inst.instance_id)
    testResults.value = { ...testResults.value, [inst.instance_id]: result }
  } catch (err) {
    testResults.value = {
      ...testResults.value,
      [inst.instance_id]: { status: 'error', message: err.message || 'Connection test failed' },
    }
  } finally {
    testing.value = { ...testing.value, [inst.instance_id]: false }
  }
}

async function pullSampleData(inst) {
  pulling.value = { ...pulling.value, [inst.instance_id]: true }
  try {
    const result = await store.pullData(connectorId, inst.instance_id)
    pullResults.value = { ...pullResults.value, [inst.instance_id]: result }
    activePullInstanceId.value = inst.instance_id
    showPullModal.value = true
  } catch (err) {
    showToast('Failed to pull data', 'error')
  } finally {
    pulling.value = { ...pulling.value, [inst.instance_id]: false }
  }
}

async function disconnectInstance(inst) {
  if (confirmDisconnectId.value !== inst.instance_id) {
    confirmDisconnectId.value = inst.instance_id
    return
  }
  try {
    await store.deleteInstance(connectorId, inst.instance_id)
    showToast(`Disconnected "${inst.name}"`, 'info')
    confirmDisconnectId.value = null
  } catch (err) {
    showToast('Failed to disconnect', 'error')
  }
}

function formatCurrency(val) {
  return '$' + val.toLocaleString()
}

function scoreColor(score) {
  if (score > 75) return 'text-green-600 bg-green-50'
  if (score >= 50) return 'text-orange-600 bg-orange-50'
  return 'text-red-600 bg-red-50'
}

function stageBadge(stage) {
  if (stage === 'Closed Won') return 'bg-green-100 text-green-700'
  if (stage === 'Negotiation') return 'bg-blue-100 text-blue-700'
  if (stage === 'Proposal Sent') return 'bg-yellow-100 text-yellow-700'
  return 'bg-gray-100 text-gray-600'
}

const activePullData = computed(() => {
  if (!activePullInstanceId.value) return null
  return pullResults.value[activePullInstanceId.value]
})

onMounted(fetchData)
</script>

<template>
  <div v-if="loading" class="space-y-6">
    <SkeletonLoader type="list" :lines="1" />
    <SkeletonLoader type="table" :lines="4" />
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
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-800">{{ connector.name }}</h1>
        <p class="text-sm text-gray-500 mt-1">{{ connector.provider }} &middot; {{ connector.type }}</p>
      </div>
      <div class="flex items-center gap-3">
        <span :class="['badge', categoryBadge(connector.category)]">{{ connector.category }}</span>
        <span class="badge bg-gray-100 text-gray-600">{{ parseAuth(connector.auth_methods) }}</span>
      </div>
    </div>

    <!-- Connector Info -->
    <div class="card">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p class="text-xs text-gray-400 mb-0.5">Provider</p>
          <p class="font-medium">{{ connector.provider }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-400 mb-0.5">Category</p>
          <span :class="['badge', categoryBadge(connector.category)]">{{ connector.category }}</span>
        </div>
        <div>
          <p class="text-xs text-gray-400 mb-0.5">Type</p>
          <p class="font-medium">{{ connector.type }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-400 mb-0.5">Agents Using</p>
          <p class="font-medium">{{ connector.agent_count || 0 }}</p>
        </div>
      </div>
    </div>

    <!-- SECTION A: Connection Form -->
    <div class="card">
      <h2 class="text-base font-semibold mb-4">New Connection</h2>

      <form @submit.prevent="createInstance" class="space-y-4">
        <!-- Dynamic form from config_schema -->
        <template v-if="hasConfigSchema">
          <div v-for="field in connector.config_schema.fields" :key="field.name">
            <!-- Boolean toggle — rendered differently, no outer label block -->
            <template v-if="field.type === 'boolean'">
              <label class="flex items-center gap-2.5 cursor-pointer">
                <input
                  v-model="formData[field.name]"
                  type="checkbox"
                  class="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                />
                <span class="text-sm text-gray-700">{{ field.label }}</span>
              </label>
            </template>

            <!-- Text / Password fields -->
            <template v-else>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ field.label }}
                <span v-if="field.required" class="text-red-400">*</span>
              </label>
              <input
                v-model="formData[field.name]"
                :type="field.type === 'password' ? 'password' : 'text'"
                :placeholder="field.placeholder || ''"
                :required="field.required"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </template>
          </div>
        </template>

        <!-- Fallback JSON form -->
        <div v-else>
          <label class="block text-sm font-medium text-gray-700 mb-1">Config (JSON)</label>
          <textarea
            v-model="fallbackJson"
            rows="4"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder='{ "api_key": "..." }'
          />
        </div>

        <div v-if="formError" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {{ formError }}
        </div>

        <button type="submit" class="btn-primary text-sm" :disabled="creating">
          {{ creating ? 'Connecting...' : 'Connect' }}
        </button>
      </form>
    </div>

    <!-- SECTION B: Active Connections -->
    <div class="card">
      <h2 class="text-base font-semibold mb-4">Active Connections</h2>

      <div v-if="store.instances.length" class="divide-y divide-gray-100">
        <div v-for="inst in store.instances" :key="inst.instance_id" class="py-4">
          <!-- Instance header row -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span :class="['w-2.5 h-2.5 rounded-full flex-shrink-0', statusDot(inst.status)]" />
              <div>
                <p class="text-sm font-medium">{{ inst.name }}</p>
                <p class="text-xs text-gray-400">Created {{ new Date(inst.created_at).toLocaleDateString() }} &middot; {{ inst.status }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                class="btn-secondary text-xs"
                :disabled="testing[inst.instance_id]"
                @click="testConnection(inst)"
              >
                {{ testing[inst.instance_id] ? 'Testing...' : 'Test Connection' }}
              </button>
              <button
                class="btn-secondary text-xs"
                :disabled="pulling[inst.instance_id]"
                @click="pullSampleData(inst)"
              >
                {{ pulling[inst.instance_id] ? 'Pulling...' : 'Pull Sample Data' }}
              </button>
              <button
                class="text-xs font-medium"
                :class="confirmDisconnectId === inst.instance_id ? 'text-red-600 hover:text-red-800' : 'text-red-400 hover:text-red-600'"
                @click="disconnectInstance(inst)"
              >
                {{ confirmDisconnectId === inst.instance_id ? 'Confirm?' : 'Disconnect' }}
              </button>
            </div>
          </div>

          <!-- Test result (inline) -->
          <div v-if="testResults[inst.instance_id]" class="mt-2 ml-5">
            <div
              v-if="testResults[inst.instance_id].status === 'connected'"
              class="inline-flex items-center gap-1.5 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5"
            >
              <span class="font-medium">&#10003; Connected</span>
              <span class="text-green-500">({{ testResults[inst.instance_id].latency_ms }}ms)</span>
              <span class="text-xs text-green-500 ml-1">{{ testResults[inst.instance_id].message }}</span>
            </div>
            <div
              v-else
              class="inline-flex items-center gap-1.5 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5"
            >
              <span class="font-medium">&#10007; Connection failed</span>
              <span class="text-xs text-red-500 ml-1">{{ testResults[inst.instance_id].message }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-8">
        <p class="text-2xl mb-2">🔗</p>
        <p class="text-sm text-gray-400">No active connections</p>
        <p class="text-xs text-gray-400 mt-1">Fill in the form above to get started</p>
      </div>
    </div>

    <!-- SECTION C: Usage -->
    <div class="card">
      <h2 class="text-base font-semibold mb-2">Usage</h2>
      <p class="text-sm text-gray-500">
        <span class="font-semibold text-gray-700">{{ connector.agent_count || 0 }}</span> agents are using this connector
      </p>
    </div>
  </div>

  <!-- Pull Data Modal -->
  <Teleport to="body">
    <div
      v-if="showPullModal && activePullData"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="showPullModal = false"
    >
      <div class="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div class="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 class="font-semibold">Sample Data</h3>
            <p class="text-xs text-gray-400 mt-0.5">
              {{ activePullData.total_count.toLocaleString() }} total records in {{ activePullData.source }}
              &middot; Pulled {{ new Date(activePullData.pulled_at).toLocaleTimeString() }}
            </p>
          </div>
          <button class="text-gray-400 hover:text-gray-600 text-xl" @click="showPullModal = false">&times;</button>
        </div>

        <div class="flex-1 overflow-auto p-4">
          <!-- Salesforce Lead Table -->
          <table v-if="isSalesforce" class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 text-left">
                <th class="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th class="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Company</th>
                <th class="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Title</th>
                <th class="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Deal Value</th>
                <th class="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Stage</th>
                <th class="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Score</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="(lead, i) in activePullData.records" :key="i" class="hover:bg-gray-50">
                <td class="px-4 py-3">
                  <p class="font-medium">{{ lead.name }}</p>
                  <p class="text-xs text-gray-400">{{ lead.email }}</p>
                </td>
                <td class="px-4 py-3">{{ lead.company }}</td>
                <td class="px-4 py-3 text-gray-600">{{ lead.title }}</td>
                <td class="px-4 py-3 font-mono font-medium">{{ formatCurrency(lead.deal_value) }}</td>
                <td class="px-4 py-3">
                  <span :class="['badge text-xs', stageBadge(lead.stage)]">{{ lead.stage }}</span>
                </td>
                <td class="px-4 py-3">
                  <span :class="['inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold', scoreColor(lead.lead_score)]">
                    {{ lead.lead_score }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Generic data display -->
          <pre v-else class="bg-gray-900 text-green-300 rounded-lg p-4 text-sm whitespace-pre-wrap">{{ JSON.stringify(activePullData.records, null, 2) }}</pre>
        </div>
      </div>
    </div>
  </Teleport>
</template>
