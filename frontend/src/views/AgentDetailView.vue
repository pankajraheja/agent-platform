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
const agentId = route.params.id

const agent = ref(null)
const skills = ref([])
const connectors = ref([])
const versions = ref([])
const runs = ref([])
const loading = ref(true)
const activeTab = ref('overview')

// Run agent
const runningAgent = ref(false)
const expandedRunId = ref(null)
const runSteps = ref({})

// Modals
const showSkillModal = ref(false)
const showConnectorModal = ref(false)
const allSkills = ref([])
const allConnectors = ref([])

// Inline edit
const editingName = ref(false)
const editName = ref('')

const tierBadge = (tier) => ({
  'no-code': 'badge-nocode',
  'low-code': 'badge-lowcode',
  'pro-code': 'badge-procode',
}[tier] || '')

const statusColor = (status) => ({
  active: 'bg-green-400',
  draft: 'bg-gray-300',
  paused: 'bg-yellow-400',
  retired: 'bg-red-400',
  running: 'bg-blue-400',
  completed: 'bg-green-400',
  failed: 'bg-red-400',
  awaiting_human: 'bg-yellow-400',
}[status] || 'bg-gray-300')

const stepStatusColor = (status) => ({
  success: 'bg-green-500',
  failed: 'bg-red-500',
  skipped: 'bg-gray-400',
  timeout: 'bg-yellow-500',
}[status] || 'bg-gray-400')

const stepTypeBadge = (type) => ({
  skill: 'bg-blue-100 text-blue-700',
  connector: 'bg-purple-100 text-purple-700',
  llm_call: 'bg-amber-100 text-amber-700',
  decision: 'bg-teal-100 text-teal-700',
  human_gate: 'bg-orange-100 text-orange-700',
}[type] || 'bg-gray-100 text-gray-600')

async function fetchAgent() {
  loading.value = true
  try {
    const [agentRes, skillsRes, connectorsRes, versionsRes, runsRes] = await Promise.all([
      api.get(`/agents/${agentId}`),
      api.get(`/agents/${agentId}/skills`),
      api.get(`/agents/${agentId}/connectors`),
      api.get(`/agents/${agentId}/versions`),
      api.get(`/runs`, { params: { agent_id: agentId, limit: 20 } }),
    ])
    agent.value = agentRes.data
    skills.value = skillsRes.data
    connectors.value = connectorsRes.data
    versions.value = versionsRes.data
    runs.value = runsRes.data
  } catch (err) {
    console.error('Failed to load agent:', err)
  } finally {
    loading.value = false
  }
}

async function runAgent() {
  runningAgent.value = true
  try {
    const res = await api.post(`/agents/${agentId}/run`, {
      user_id: auth.user?.user_id,
      persona_id: auth.user?.persona_id,
    })
    const { run, steps } = res.data

    // Refresh runs list
    const runsRes = await api.get(`/runs`, { params: { agent_id: agentId, limit: 20 } })
    runs.value = runsRes.data

    // Cache the steps for the new run
    runSteps.value[run.run_id] = steps

    showToast(`Run complete — ${steps.length} steps, ${run.total_tokens?.toLocaleString()} tokens, ${(run.duration_ms / 1000).toFixed(1)}s`, 'success', 5000)

    // Switch to runs tab and expand the new run
    activeTab.value = 'runs'
    expandedRunId.value = run.run_id
  } catch (err) {
    console.error('Run agent failed:', err)
    showToast(err.message || 'Run failed', 'error')
  } finally {
    runningAgent.value = false
  }
}

async function toggleRunExpand(run) {
  if (expandedRunId.value === run.run_id) {
    expandedRunId.value = null
    return
  }
  expandedRunId.value = run.run_id
  if (!runSteps.value[run.run_id]) {
    try {
      const res = await api.get(`/runs/${run.run_id}/steps`)
      runSteps.value[run.run_id] = res.data
    } catch (err) {
      console.error('Failed to load steps:', err)
    }
  }
}

function startEditName() {
  editName.value = agent.value.name
  editingName.value = true
}

async function saveName() {
  if (!editName.value.trim()) return
  try {
    const res = await api.put(`/agents/${agentId}`, { name: editName.value.trim() })
    agent.value = res.data
  } catch (err) {
    console.error('Failed to update name:', err)
  }
  editingName.value = false
}

async function openSkillModal() {
  try {
    const res = await api.get('/skills', { params: { limit: 100 } })
    allSkills.value = res.data
    showSkillModal.value = true
  } catch (err) { console.error(err) }
}

async function linkSkill(skill) {
  try {
    await api.post(`/agents/${agentId}/skills`, {
      skill_id: skill.skill_id,
      execution_order: skills.value.length,
    })
    const res = await api.get(`/agents/${agentId}/skills`)
    skills.value = res.data
    showSkillModal.value = false
    showToast(`Linked skill "${skill.name}"`, 'success')
  } catch (err) {
    console.error('Link skill failed:', err)
    showToast('Failed to link skill', 'error')
  }
}

async function openConnectorModal() {
  try {
    const res = await api.get('/connectors', { params: { limit: 100 } })
    allConnectors.value = res.data
    showConnectorModal.value = true
  } catch (err) { console.error(err) }
}

async function promoteVersion(version) {
  try {
    await api.put(`/agents/${agentId}/versions`, {
      ...version,
      status: 'published',
    })
    const res = await api.get(`/agents/${agentId}/versions`)
    versions.value = res.data
  } catch (err) { console.error('Promote failed:', err) }
}

onMounted(fetchAgent)
</script>

<template>
  <div v-if="loading" class="space-y-6">
    <SkeletonLoader type="list" :lines="1" />
    <SkeletonLoader type="table" :lines="4" />
  </div>

  <div v-else-if="!agent" class="text-center py-20">
    <p class="text-4xl mb-3">🤖</p>
    <p class="text-gray-500 font-medium">Agent not found</p>
    <button class="btn-primary text-sm mt-4" @click="router.push('/agents')">Back to Agents</button>
  </div>

  <div v-else class="space-y-6">
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-1.5 text-sm">
      <router-link to="/agents" class="text-gray-400 hover:text-brand-600 transition-colors">Agents</router-link>
      <span class="text-gray-300">/</span>
      <span class="text-gray-700 font-medium">{{ agent.name }}</span>
    </nav>

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div v-if="editingName" class="flex items-center gap-2">
          <input
            v-model="editName"
            class="text-xl font-bold border border-brand-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
            @keyup.enter="saveName"
            @keyup.escape="editingName = false"
          />
          <button class="btn-primary text-xs" @click="saveName">Save</button>
          <button class="text-xs text-gray-400" @click="editingName = false">Cancel</button>
        </div>
        <h1
          v-else
          class="text-xl font-bold text-gray-800 cursor-pointer hover:text-brand-600"
          @click="startEditName"
        >{{ agent.name }}</h1>
      </div>
      <div class="flex items-center gap-3">
        <button
          class="btn-primary text-sm flex items-center gap-2"
          :disabled="runningAgent"
          @click="runAgent"
        >
          <svg v-if="runningAgent" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span v-else>&#9654;</span>
          {{ runningAgent ? 'Running...' : 'Run Agent' }}
        </button>
        <span class="inline-flex items-center gap-1.5">
          <span :class="['w-2 h-2 rounded-full', statusColor(agent.status)]" />
          <span class="text-sm text-gray-600">{{ agent.status }}</span>
        </span>
        <span :class="['badge', tierBadge(agent.builder_tier)]">{{ agent.builder_tier }}</span>
      </div>
    </div>

    <p v-if="agent.description" class="text-sm text-gray-500">{{ agent.description }}</p>

    <!-- Tabs -->
    <div class="border-b border-gray-200">
      <nav class="flex gap-6">
        <button
          v-for="tab in ['overview', 'versions', 'runs']"
          :key="tab"
          :class="[
            'pb-3 text-sm font-medium border-b-2 transition-colors capitalize',
            activeTab === tab
              ? 'border-brand-500 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          ]"
          @click="activeTab = tab"
        >{{ tab }}</button>
      </nav>
    </div>

    <!-- TAB 1: Overview -->
    <div v-if="activeTab === 'overview'" class="space-y-6">
      <!-- Linked Skills -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-semibold">Linked Skills</h2>
          <button class="btn-secondary text-xs" @click="openSkillModal">+ Add Skill</button>
        </div>
        <div v-if="skills.length" class="space-y-2">
          <div
            v-for="(s, i) in skills"
            :key="s.skill_id"
            class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
          >
            <div class="flex items-center gap-3">
              <span class="text-xs font-bold text-gray-400 w-6">{{ i + 1 }}</span>
              <div>
                <p class="text-sm font-medium">{{ s.name }}</p>
                <p class="text-xs text-gray-400">{{ s.description }}</p>
              </div>
            </div>
            <span class="badge bg-blue-100 text-blue-700">{{ s.category }}</span>
          </div>
        </div>
        <p v-else class="text-sm text-gray-400">No skills linked yet.</p>
      </div>

      <!-- Linked Connectors -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-semibold">Linked Connectors</h2>
          <button class="btn-secondary text-xs" @click="openConnectorModal">+ Add Connector</button>
        </div>
        <div v-if="connectors.length" class="space-y-2">
          <div
            v-for="c in connectors"
            :key="c.instance_id"
            class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
          >
            <div>
              <p class="text-sm font-medium">{{ c.connector_name || c.name }}</p>
              <p class="text-xs text-gray-400">{{ c.provider }} &middot; {{ c.purpose || 'General' }}</p>
            </div>
            <span class="badge bg-purple-100 text-purple-700">{{ c.category }}</span>
          </div>
        </div>
        <p v-else class="text-sm text-gray-400">No connectors linked yet.</p>
      </div>
    </div>

    <!-- TAB 2: Versions -->
    <div v-if="activeTab === 'versions'">
      <div class="card">
        <div v-if="versions.length" class="divide-y divide-gray-100">
          <div
            v-for="v in versions"
            :key="v.version_id"
            class="flex items-center justify-between py-3"
          >
            <div>
              <p class="text-sm font-medium">v{{ v.version_number }}</p>
              <p class="text-xs text-gray-400">{{ new Date(v.created_at).toLocaleString() }}</p>
            </div>
            <div class="flex items-center gap-3">
              <span :class="['badge', v.status === 'published' ? 'bg-green-100 text-green-700' : v.status === 'draft' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-600']">
                {{ v.status }}
              </span>
              <button
                v-if="v.status === 'draft'"
                class="btn-primary text-xs"
                @click="promoteVersion(v)"
              >Publish</button>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-gray-400">No versions yet.</p>
      </div>
    </div>

    <!-- TAB 3: Runs -->
    <div v-if="activeTab === 'runs'">
      <div class="card">
        <div v-if="runs.length" class="divide-y divide-gray-100">
          <div v-for="r in runs" :key="r.run_id">
            <!-- Run row -->
            <div
              class="flex items-center justify-between py-3 cursor-pointer hover:bg-gray-50 px-2 -mx-2 rounded-lg transition-colors"
              @click="toggleRunExpand(r)"
            >
              <div class="flex items-center gap-3">
                <span
                  class="text-gray-400 text-xs transition-transform"
                  :class="expandedRunId === r.run_id ? 'rotate-90' : ''"
                >&#9654;</span>
                <div>
                  <p class="text-sm font-mono">{{ r.run_id?.substring(0, 8) }}...</p>
                  <p class="text-xs text-gray-400">{{ r.trigger_type || 'manual' }} &middot; {{ new Date(r.started_at).toLocaleString() }}</p>
                </div>
              </div>
              <div class="flex items-center gap-4 text-sm">
                <span class="text-xs text-gray-400">{{ r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : '—' }}</span>
                <span class="text-xs text-gray-400">{{ r.total_tokens?.toLocaleString() || 0 }} tokens</span>
                <span class="inline-flex items-center gap-1.5">
                  <span :class="['w-2 h-2 rounded-full', statusColor(r.status)]" />
                  {{ r.status }}
                </span>
              </div>
            </div>

            <!-- Expanded: Step timeline -->
            <div v-if="expandedRunId === r.run_id" class="pl-8 pr-2 pb-4 pt-1">
              <div v-if="runSteps[r.run_id]?.length" class="relative">
                <!-- Vertical line -->
                <div class="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gray-200" />

                <div
                  v-for="(step, idx) in runSteps[r.run_id]"
                  :key="step.step_id"
                  class="relative flex items-start gap-4 pb-4 last:pb-0"
                >
                  <!-- Dot -->
                  <div class="relative z-10 flex-shrink-0">
                    <div :class="['w-4 h-4 rounded-full border-2 border-white shadow-sm', stepStatusColor(step.status)]" />
                  </div>

                  <!-- Step content -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-gray-400">Step {{ idx + 1 }}</span>
                        <span :class="['badge text-[10px]', stepTypeBadge(step.step_type)]">{{ step.step_type }}</span>
                        <span class="text-sm font-medium">{{ step.name || step.input?.skill_name || step.input?.connector_name || '—' }}</span>
                      </div>
                      <div class="flex items-center gap-3 text-xs text-gray-400">
                        <span>{{ step.tokens_used }} tokens</span>
                        <span>{{ step.duration_ms }}ms</span>
                        <span :class="step.status === 'success' ? 'text-green-600' : 'text-red-600'">{{ step.status }}</span>
                      </div>
                    </div>
                    <p class="text-xs text-gray-400 mt-0.5">
                      {{ new Date(step.executed_at).toLocaleTimeString() }}
                      <span v-if="step.output?.result" class="ml-2 text-gray-500">&mdash; {{ step.output.result }}</span>
                    </p>
                  </div>
                </div>
              </div>
              <p v-else class="text-xs text-gray-400">No steps recorded for this run.</p>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-gray-400">No runs yet for this agent.</p>
      </div>
    </div>

    <!-- Add Skill Modal -->
    <Teleport to="body">
      <div v-if="showSkillModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="showSkillModal = false">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[70vh] flex flex-col">
          <div class="flex items-center justify-between px-6 py-4 border-b">
            <h3 class="font-semibold">Add Skill</h3>
            <button class="text-gray-400 hover:text-gray-600" @click="showSkillModal = false">&times;</button>
          </div>
          <div class="flex-1 overflow-y-auto p-4 space-y-2">
            <div
              v-for="s in allSkills"
              :key="s.skill_id"
              class="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-brand-300 cursor-pointer transition-colors"
              @click="linkSkill(s)"
            >
              <div>
                <p class="text-sm font-medium">{{ s.name }}</p>
                <p class="text-xs text-gray-400">{{ s.description }}</p>
              </div>
              <span class="badge bg-blue-100 text-blue-700">{{ s.category }}</span>
            </div>
            <p v-if="!allSkills.length" class="text-sm text-gray-400 text-center py-4">No skills available.</p>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Add Connector Modal -->
    <Teleport to="body">
      <div v-if="showConnectorModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="showConnectorModal = false">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[70vh] flex flex-col">
          <div class="flex items-center justify-between px-6 py-4 border-b">
            <h3 class="font-semibold">Add Connector</h3>
            <button class="text-gray-400 hover:text-gray-600" @click="showConnectorModal = false">&times;</button>
          </div>
          <div class="flex-1 overflow-y-auto p-4 space-y-2">
            <div
              v-for="c in allConnectors"
              :key="c.connector_id"
              class="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-brand-300 cursor-pointer transition-colors"
            >
              <div>
                <p class="text-sm font-medium">{{ c.name }}</p>
                <p class="text-xs text-gray-400">{{ c.provider }} &middot; {{ c.type }}</p>
              </div>
              <span class="badge bg-purple-100 text-purple-700">{{ c.category }}</span>
            </div>
            <p v-if="!allConnectors.length" class="text-sm text-gray-400 text-center py-4">No connectors available.</p>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
