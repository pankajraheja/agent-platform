<script setup>
import { ref, computed, onMounted } from 'vue'
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
const runs = ref([])
const loading = ref(true)
const activeTab = ref('overview')

// Run agent
const runningAgent = ref(false)
const expandedRunId = ref(null)
const runSteps = ref({})
const expandedStepRaw = ref({}) // track which steps show raw JSON

// Modals
const showSkillModal = ref(false)
const showConnectorModal = ref(false)
const allSkills = ref([])
const allConnectors = ref([])

const tierBadgeClass = (tier) => ({
  'no-code': 'bg-green-100 text-green-700',
  'low-code': 'bg-orange-100 text-orange-700',
  'pro-code': 'bg-red-100 text-red-700',
}[tier] || 'bg-gray-100 text-gray-600')

const statusBadgeClass = (status) => ({
  active: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  paused: 'bg-yellow-100 text-yellow-700',
  retired: 'bg-red-100 text-red-600',
}[status] || 'bg-gray-100 text-gray-600')

const statusDot = (status) => ({
  active: 'bg-green-400',
  draft: 'bg-gray-300',
  paused: 'bg-yellow-400',
  retired: 'bg-red-400',
  running: 'bg-blue-400',
  completed: 'bg-green-400',
  failed: 'bg-red-400',
}[status] || 'bg-gray-300')

const stepBorder = (status) => ({
  success: 'border-l-green-500',
  failed: 'border-l-red-500',
  skipped: 'border-l-gray-400',
  timeout: 'border-l-yellow-500',
}[status] || 'border-l-gray-300')

const stepTypeBadge = (type) => ({
  skill: 'bg-blue-100 text-blue-700',
  connector: 'bg-purple-100 text-purple-700',
  llm_call: 'bg-amber-100 text-amber-700',
}[type] || 'bg-gray-100 text-gray-600')

// Build execution pipeline — connectors first (step 0), then skills by execution_order
const pipeline = computed(() => {
  const steps = []
  for (const c of connectors.value) {
    steps.push({ type: 'connector', name: c.connector_name || c.name, description: c.purpose || 'Pull data', icon: '🔌', category: c.category })
  }
  for (const s of skills.value) {
    steps.push({ type: 'skill', name: s.name, description: s.description, icon: '⚡', category: s.category, order: s.execution_order })
  }
  return steps
})

async function fetchAgent() {
  loading.value = true
  try {
    const [agentRes, skillsRes, connectorsRes, runsRes] = await Promise.all([
      api.get(`/agents/${agentId}`),
      api.get(`/agents/${agentId}/skills`),
      api.get(`/agents/${agentId}/connectors`),
      api.get(`/runs`, { params: { agent_id: agentId, limit: 20, orderBy: 'started_at DESC' } }),
    ])
    agent.value = agentRes.data
    skills.value = skillsRes.data
    connectors.value = connectorsRes.data
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
    const runsRes = await api.get(`/runs`, { params: { agent_id: agentId, limit: 20, orderBy: 'started_at DESC' } })
    runs.value = runsRes.data

    // Cache the steps for the new run
    runSteps.value[run.run_id] = steps

    showToast(`Agent completed — ${steps.length} steps, ${run.total_tokens?.toLocaleString()} tokens, ${(run.duration_ms / 1000).toFixed(1)}s`, 'success', 5000)

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

async function toggleRunExpand(r) {
  if (expandedRunId.value === r.run_id) {
    expandedRunId.value = null
    return
  }
  expandedRunId.value = r.run_id
  if (!runSteps.value[r.run_id]) {
    try {
      const res = await api.get(`/runs/${r.run_id}/steps`)
      runSteps.value[r.run_id] = res.data
    } catch (err) {
      console.error('Failed to load steps:', err)
    }
  }
}

function toggleStepRaw(stepId) {
  expandedStepRaw.value = { ...expandedStepRaw.value, [stepId]: !expandedStepRaw.value[stepId] }
}

// Step summary helpers
function stepSummary(step) {
  const output = typeof step.output === 'string' ? JSON.parse(step.output) : step.output
  if (!output) return null

  if (step.step_type === 'connector' && output.name) {
    return `Pulled: ${output.name} @ ${output.company} ($${output.deal_value?.toLocaleString()})`
  }
  if (output.classification) {
    return `${output.classification} (${Math.round(output.confidence * 100)}% confidence) — ${output.recommended_action}`
  }
  if (output.subject) {
    return `Subject: "${output.subject}" — ${output.word_count} words, ${output.tone}`
  }
  if (output.result) return output.result
  if (output.records_fetched) return `${output.records_fetched} records fetched`
  return null
}

function parseOutput(step) {
  if (typeof step.output === 'string') {
    try { return JSON.parse(step.output) } catch { return step.output }
  }
  return step.output
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
      execution_order: skills.value.length + 1,
    })
    const res = await api.get(`/agents/${agentId}/skills`)
    skills.value = res.data
    showSkillModal.value = false
    showToast(`Linked skill "${skill.name}"`, 'success')
  } catch (err) {
    showToast('Failed to link skill', 'error')
  }
}

async function unlinkSkill(skill) {
  try {
    await api.delete(`/agents/${agentId}/skills/${skill.skill_id}`)
    skills.value = skills.value.filter(s => s.skill_id !== skill.skill_id)
    showToast(`Removed "${skill.name}"`, 'info')
  } catch (err) {
    showToast('Failed to remove skill', 'error')
  }
}

async function openConnectorModal() {
  try {
    const res = await api.get('/connectors', { params: { limit: 100 } })
    allConnectors.value = res.data
    showConnectorModal.value = true
  } catch (err) { console.error(err) }
}

async function unlinkConnector(conn) {
  try {
    await api.delete(`/agents/${agentId}/connectors/${conn.instance_id}`)
    connectors.value = connectors.value.filter(c => c.instance_id !== conn.instance_id)
    showToast(`Removed "${conn.connector_name}"`, 'info')
  } catch (err) {
    showToast('Failed to remove connector', 'error')
  }
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
      <div>
        <h1 class="text-xl font-bold text-gray-800">{{ agent.name }}</h1>
        <p v-if="agent.description" class="text-sm text-gray-500 mt-1">{{ agent.description }}</p>
        <p v-if="agent.metadata?.forked_from" class="text-xs text-gray-400 mt-1 inline-flex items-center gap-1">
          &#128260; Forked from template
        </p>
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
        <span :class="['badge', statusBadgeClass(agent.status)]">{{ agent.status }}</span>
        <span :class="['badge', tierBadgeClass(agent.builder_tier)]">{{ agent.builder_tier }}</span>
      </div>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200">
      <nav class="flex gap-6">
        <button
          v-for="tab in ['overview', 'runs']"
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
    <div v-if="activeTab === 'overview'" class="grid grid-cols-12 gap-6">
      <!-- Left: Execution Pipeline -->
      <div class="col-span-7">
        <div class="card">
          <h2 class="text-base font-semibold mb-4">Execution Pipeline</h2>

          <div v-if="pipeline.length" class="space-y-0">
            <div v-for="(step, idx) in pipeline" :key="idx">
              <!-- Step card -->
              <div class="flex items-center gap-4 p-3 rounded-lg border border-gray-200 bg-white">
                <div class="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                  {{ step.icon }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-gray-400">Step {{ idx }}</span>
                    <span :class="['badge text-[10px]', stepTypeBadge(step.type)]">{{ step.type }}</span>
                    <span class="text-sm font-medium">{{ step.name }}</span>
                  </div>
                  <p class="text-xs text-gray-400 mt-0.5 truncate">{{ step.description }}</p>
                </div>
                <span :class="['badge text-[10px]', step.type === 'connector' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700']">{{ step.category }}</span>
              </div>

              <!-- Arrow connector -->
              <div v-if="idx < pipeline.length - 1" class="flex justify-center py-1">
                <div class="w-0.5 h-6 bg-gray-300 relative">
                  <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 text-gray-300 text-xs">&#9660;</div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-8">
            <p class="text-2xl mb-2">🔗</p>
            <p class="text-sm text-gray-400">No steps configured. Add skills and connectors to build your pipeline.</p>
          </div>
        </div>
      </div>

      <!-- Right: Agent Configuration -->
      <div class="col-span-5 space-y-6">
        <!-- Linked Skills -->
        <div class="card">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold">Linked Skills</h3>
            <button class="btn-secondary text-xs" @click="openSkillModal">+ Add</button>
          </div>
          <div v-if="skills.length" class="space-y-2">
            <div
              v-for="s in skills"
              :key="s.skill_id"
              class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
            >
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-gray-400 w-5">{{ s.execution_order }}</span>
                <div>
                  <p class="text-sm font-medium">{{ s.name }}</p>
                  <p class="text-xs text-gray-400">{{ s.category }}</p>
                </div>
              </div>
              <button class="text-xs text-red-400 hover:text-red-600" @click="unlinkSkill(s)">Remove</button>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400">No skills linked.</p>
        </div>

        <!-- Linked Connectors -->
        <div class="card">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold">Linked Connectors</h3>
            <button class="btn-secondary text-xs" @click="openConnectorModal">+ Add</button>
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
              <button class="text-xs text-red-400 hover:text-red-600" @click="unlinkConnector(c)">Remove</button>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400">No connectors linked.</p>
        </div>
      </div>
    </div>

    <!-- TAB 2: Runs -->
    <div v-if="activeTab === 'runs'">
      <div v-if="runs.length" class="space-y-3">
        <div v-for="r in runs" :key="r.run_id" class="card p-0 overflow-hidden">
          <!-- Run header row -->
          <div
            class="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
            @click="toggleRunExpand(r)"
          >
            <div class="flex items-center gap-3">
              <span
                class="text-gray-400 text-xs transition-transform"
                :class="expandedRunId === r.run_id ? 'rotate-90' : ''"
              >&#9654;</span>
              <div>
                <p class="text-sm font-mono font-medium">Run #{{ r.run_id?.substring(0, 8) }}...</p>
                <p class="text-xs text-gray-400">{{ r.trigger_type || 'manual' }} &middot; {{ new Date(r.started_at).toLocaleString() }}</p>
              </div>
            </div>
            <div class="flex items-center gap-4 text-sm">
              <span class="text-xs text-gray-500 font-mono">{{ r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : '—' }}</span>
              <span class="text-xs text-gray-500 font-mono">{{ r.total_tokens?.toLocaleString() || 0 }} tokens</span>
              <span class="inline-flex items-center gap-1.5">
                <span :class="['w-2 h-2 rounded-full', statusDot(r.status)]" />
                <span class="text-sm">{{ r.status }}</span>
              </span>
            </div>
          </div>

          <!-- Expanded: Step trace -->
          <div v-if="expandedRunId === r.run_id" class="border-t border-gray-100 bg-gray-50/50 px-5 py-4">
            <div v-if="runSteps[r.run_id]?.length" class="space-y-3">
              <div
                v-for="(step, idx) in runSteps[r.run_id]"
                :key="step.step_id"
                :class="['border-l-4 rounded-lg bg-white p-4 shadow-sm', stepBorder(step.status)]"
              >
                <!-- Step header -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-gray-400">Step {{ step.step_number || idx + 1 }}</span>
                    <span class="text-base">{{ step.step_type === 'connector' ? '🔌' : '⚡' }}</span>
                    <span :class="['badge text-[10px]', stepTypeBadge(step.step_type)]">{{ step.step_type }}</span>
                    <span class="text-sm font-semibold">{{ step.name || '—' }}</span>
                  </div>
                  <div class="flex items-center gap-3 text-xs">
                    <span class="text-gray-400 font-mono">{{ step.duration_ms }}ms</span>
                    <span class="text-gray-400 font-mono">{{ step.tokens_used }}t</span>
                    <span :class="step.status === 'success' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'">
                      {{ step.status === 'success' ? '&#10003;' : '&#10007;' }} {{ step.status }}
                    </span>
                  </div>
                </div>

                <!-- Step summary -->
                <p v-if="stepSummary(step)" class="text-sm text-gray-600 mt-2 leading-relaxed">
                  &rarr; {{ stepSummary(step) }}
                </p>

                <!-- Show Raw Output toggle -->
                <div class="mt-2">
                  <button
                    class="text-xs text-brand-600 hover:text-brand-800 font-medium"
                    @click.stop="toggleStepRaw(step.step_id)"
                  >
                    {{ expandedStepRaw[step.step_id] ? 'Hide Raw Output' : 'Show Raw Output' }}
                  </button>
                  <pre
                    v-if="expandedStepRaw[step.step_id]"
                    class="mt-2 bg-gray-900 text-green-300 rounded-lg p-3 text-xs whitespace-pre-wrap overflow-x-auto max-h-[300px] overflow-y-auto"
                  >{{ JSON.stringify(parseOutput(step), null, 2) }}</pre>
                </div>
              </div>
            </div>
            <p v-else class="text-xs text-gray-400">No steps recorded for this run.</p>
          </div>
        </div>
      </div>
      <div v-else class="card text-center py-12">
        <p class="text-2xl mb-2">🏃</p>
        <p class="text-sm text-gray-400">No runs yet. Click "Run Agent" to execute the pipeline.</p>
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
