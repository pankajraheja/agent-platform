<script setup>
import { ref, computed, onMounted } from 'vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'
import api from '../api/client'

const allRuns = ref([])
const agents = ref([])
const loading = ref(true)
const expandedRunId = ref(null)
const runSteps = ref({})

// Filters
const statusFilter = ref('all')
const agentFilter = ref('all')

const statusOptions = ['all', 'completed', 'running', 'failed', 'awaiting_human']

const filteredRuns = computed(() => {
  return allRuns.value.filter(r => {
    if (statusFilter.value !== 'all' && r.status !== statusFilter.value) return false
    if (agentFilter.value !== 'all' && r.agent_id !== agentFilter.value) return false
    return true
  })
})

const statusColor = (status) => ({
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

// Map agent_id to name for display
const agentName = (agentId) => {
  const a = agents.value.find(x => x.agent_id === agentId)
  return a ? a.name : agentId?.substring(0, 8) + '...'
}

async function fetchData() {
  loading.value = true
  try {
    const [runsRes, agentsRes] = await Promise.all([
      api.get('/runs', { params: { limit: 100 } }),
      api.get('/agents', { params: { limit: 100 } }),
    ])
    allRuns.value = runsRes.data
    agents.value = agentsRes.data
  } catch (err) {
    console.error('Failed to load runs:', err)
  } finally {
    loading.value = false
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

onMounted(fetchData)
</script>

<template>
  <div class="space-y-4">
    <!-- Header & Filters -->
    <div class="flex items-center justify-between">
      <p class="text-sm text-gray-500">{{ filteredRuns.length }} runs</p>
    </div>

    <div class="flex items-center gap-4">
      <!-- Status filter -->
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500">Status:</label>
        <div class="flex gap-1">
          <button
            v-for="s in statusOptions"
            :key="s"
            :class="[
              'px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize',
              statusFilter === s
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            ]"
            @click="statusFilter = s"
          >{{ s }}</button>
        </div>
      </div>

      <!-- Agent filter -->
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500">Agent:</label>
        <select
          v-model="agentFilter"
          class="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">All agents</option>
          <option v-for="a in agents" :key="a.agent_id" :value="a.agent_id">{{ a.name }}</option>
        </select>
      </div>
    </div>

    <!-- Runs list -->
    <div v-if="loading" class="py-4">
      <SkeletonLoader type="table" :lines="6" />
    </div>

    <div v-else-if="filteredRuns.length" class="card divide-y divide-gray-100">
      <div v-for="r in filteredRuns" :key="r.run_id">
        <!-- Run row -->
        <div
          class="flex items-center justify-between py-3 cursor-pointer hover:bg-gray-50 px-3 -mx-3 rounded-lg transition-colors"
          @click="toggleRunExpand(r)"
        >
          <div class="flex items-center gap-3">
            <span
              class="text-gray-400 text-xs transition-transform inline-block"
              :class="expandedRunId === r.run_id ? 'rotate-90' : ''"
            >&#9654;</span>
            <div>
              <div class="flex items-center gap-2">
                <p class="text-sm font-mono">{{ r.run_id?.substring(0, 8) }}...</p>
                <span class="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{{ agentName(r.agent_id) }}</span>
              </div>
              <p class="text-xs text-gray-400">{{ r.trigger_type || 'manual' }} &middot; {{ new Date(r.started_at).toLocaleString() }}</p>
            </div>
          </div>
          <div class="flex items-center gap-4 text-sm">
            <span class="text-xs text-gray-400">{{ r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : '—' }}</span>
            <span class="text-xs text-gray-400">{{ r.total_tokens?.toLocaleString() || 0 }} tokens</span>
            <span v-if="r.cost_usd" class="text-xs text-gray-400">${{ r.cost_usd }}</span>
            <span class="inline-flex items-center gap-1.5">
              <span :class="['w-2 h-2 rounded-full', statusColor(r.status)]" />
              {{ r.status }}
            </span>
          </div>
        </div>

        <!-- Expanded: Step timeline -->
        <div v-if="expandedRunId === r.run_id" class="pl-10 pr-3 pb-4 pt-1">
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

    <div v-else class="card text-center py-16">
      <p class="text-4xl mb-3">📜</p>
      <p class="text-gray-500 font-medium">
        {{ statusFilter !== 'all' || agentFilter !== 'all' ? 'No runs matching your filters' : 'No agent runs yet' }}
      </p>
      <p class="text-xs text-gray-400 mt-1">Run an agent from its detail page to see execution history here</p>
    </div>
  </div>
</template>
