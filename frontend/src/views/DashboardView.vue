<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'
import SkeletonLoader from '../components/SkeletonLoader.vue'
import api from '../api/client'
import BarChart from '../components/BarChart.vue'

const router = useRouter()
const auth = useAuthStore()
const { showToast } = useToast()

const personaData = ref(null)
const summary = ref(null)
const skillReuse = ref([])
const personaAdoption = ref([])
const loading = ref(true)
const forkingId = ref(null)

// Onboarding completion stored in localStorage per user
const storageKey = computed(() => `onboarding_${auth.user?.user_id}`)
const completedSteps = ref({})

function loadCompletedSteps() {
  try {
    const stored = localStorage.getItem(storageKey.value)
    if (stored) completedSteps.value = JSON.parse(stored)
  } catch { /* ignore */ }
}

function toggleStep(stepId) {
  completedSteps.value[stepId] = !completedSteps.value[stepId]
  localStorage.setItem(storageKey.value, JSON.stringify(completedSteps.value))
}

const completedCount = computed(() =>
  personaData.value?.onboarding?.filter(s => completedSteps.value[s.onboarding_id]).length || 0
)

const tierBadgeClass = computed(() => ({
  'badge-nocode': auth.user?.preferred_tier === 'no-code',
  'badge-lowcode': auth.user?.preferred_tier === 'low-code',
  'badge-procode': auth.user?.preferred_tier === 'pro-code',
}))

const categoryColors = {
  summarize: 'bg-blue-100 text-blue-700',
  classify: 'bg-purple-100 text-purple-700',
  extract: 'bg-amber-100 text-amber-700',
  generate: 'bg-green-100 text-green-700',
  transform: 'bg-pink-100 text-pink-700',
  custom: 'bg-gray-100 text-gray-700',
}

// Total agents across all statuses
const totalAgents = computed(() => {
  if (!summary.value?.agents_by_status) return 0
  return summary.value.agents_by_status.reduce((sum, s) => sum + s.count, 0)
})

// Chart data: Skill Reuse
const skillChartLabels = computed(() => skillReuse.value.map(s => s.name))
const skillChartDatasets = computed(() => [{
  label: 'Agents Using',
  data: skillReuse.value.map(s => s.agents_using),
  backgroundColor: '#6366f1',
  borderRadius: 4,
  barThickness: 20,
}])

// Chart data: Persona Adoption
const personaChartLabels = computed(() => personaAdoption.value.map(p => p.persona))
const personaChartDatasets = computed(() => [
  {
    label: 'Agents Created',
    data: personaAdoption.value.map(p => p.agents_created),
    backgroundColor: '#8b5cf6',
    borderRadius: 4,
    barThickness: 20,
  },
  {
    label: 'Total Runs',
    data: personaAdoption.value.map(p => p.total_runs),
    backgroundColor: '#06b6d4',
    borderRadius: 4,
    barThickness: 20,
  },
])

async function forkTemplate(template) {
  forkingId.value = template.template_id
  try {
    const res = await api.post(`/templates/${template.template_id}/fork`, {
      workspace_id: auth.user.workspace_id,
      user_id: auth.user.user_id,
    })
    showToast(`Agent created from "${template.name}"`, 'success')
    router.push(`/agents`)
  } catch (err) {
    console.error('Fork failed:', err)
    showToast('Failed to create agent from template', 'error')
  } finally {
    forkingId.value = null
  }
}

onMounted(async () => {
  loadCompletedSteps()
  try {
    const requests = []

    // Fetch persona full data if user has a persona
    if (auth.user?.persona_id) {
      requests.push(api.get(`/personas/${auth.user.persona_id}/full`))
    } else {
      requests.push(Promise.resolve(null))
    }

    // Fetch dashboard data
    if (auth.user?.org_id) {
      requests.push(api.get('/dashboard/summary', { params: { org_id: auth.user.org_id } }))
      requests.push(api.get('/dashboard/skill-reuse', { params: { org_id: auth.user.org_id } }))
      requests.push(api.get('/dashboard/persona-adoption', { params: { org_id: auth.user.org_id } }))
    } else {
      requests.push(Promise.resolve(null))
      requests.push(Promise.resolve(null))
      requests.push(Promise.resolve(null))
    }

    const [personaRes, summaryRes, skillRes, personaAdoptionRes] = await Promise.all(requests)
    if (personaRes) personaData.value = personaRes.data
    if (summaryRes) summary.value = summaryRes.data
    if (skillRes) skillReuse.value = skillRes.data || []
    if (personaAdoptionRes) personaAdoption.value = personaAdoptionRes.data || []
  } catch (err) {
    console.error('Dashboard load error:', err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading" class="space-y-6">
    <SkeletonLoader type="list" :lines="2" />
    <SkeletonLoader type="card" :lines="3" />
    <SkeletonLoader type="table" :lines="4" />
  </div>

  <div v-else class="space-y-8">

    <!-- SECTION A — Welcome Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <span class="text-4xl">{{ auth.persona?.icon || '👋' }}</span>
        <div>
          <h1 class="text-2xl font-bold text-gray-800">
            Welcome back, {{ auth.user?.display_name || 'User' }}
          </h1>
          <p class="text-sm text-gray-500 mt-0.5">
            {{ auth.persona?.name || 'No persona assigned' }}
            <span class="mx-1 text-gray-300">&middot;</span>
            {{ auth.persona?.department || '' }}
          </p>
        </div>
      </div>
      <span :class="['badge', tierBadgeClass]">
        {{ auth.user?.preferred_tier || 'no-code' }}
      </span>
    </div>

    <!-- SECTION B — Onboarding Checklist -->
    <div v-if="personaData?.onboarding?.length" class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">Getting Started</h2>
        <span class="text-sm text-gray-500">
          {{ completedCount }} / {{ personaData.onboarding.length }} completed
        </span>
      </div>

      <!-- Progress bar -->
      <div class="w-full bg-gray-100 rounded-full h-2 mb-5">
        <div
          class="bg-brand-500 h-2 rounded-full transition-all duration-300"
          :style="{ width: `${(completedCount / personaData.onboarding.length) * 100}%` }"
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          v-for="step in personaData.onboarding"
          :key="step.onboarding_id"
          :class="[
            'border rounded-lg p-4 transition-colors cursor-pointer',
            completedSteps[step.onboarding_id]
              ? 'bg-green-50 border-green-200'
              : 'bg-white border-gray-200 hover:border-brand-300'
          ]"
          @click="toggleStep(step.onboarding_id)"
        >
          <div class="flex items-start justify-between">
            <div>
              <p class="font-medium text-sm">{{ step.title }}</p>
              <p class="text-xs text-gray-500 mt-1">{{ step.content }}</p>
            </div>
            <span class="text-lg ml-2 flex-shrink-0">
              {{ completedSteps[step.onboarding_id] ? '✅' : '⬜' }}
            </span>
          </div>
          <span class="badge bg-gray-100 text-gray-600 mt-2">{{ step.step_type }}</span>
        </div>
      </div>
    </div>

    <!-- SECTION C — Recommended Templates -->
    <div v-if="personaData?.recommended_templates?.length">
      <h2 class="text-lg font-semibold mb-3">Recommended Templates</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="t in personaData.recommended_templates"
          :key="t.template_id"
          class="card flex flex-col justify-between"
        >
          <div>
            <div class="flex items-center justify-between mb-2">
              <h3 class="font-semibold text-sm">{{ t.name }}</h3>
              <span class="badge bg-gray-100 text-gray-600">{{ t.category }}</span>
            </div>
            <p class="text-xs text-gray-500 leading-relaxed">{{ t.description }}</p>
            <div class="flex items-center gap-3 mt-3 text-xs text-gray-400">
              <span>{{ t.builder_tier }}</span>
              <span>{{ t.fork_count || 0 }} forks</span>
            </div>
          </div>
          <button
            class="btn-primary text-sm mt-4 w-full"
            :disabled="forkingId === t.template_id"
            @click="forkTemplate(t)"
          >
            {{ forkingId === t.template_id ? 'Creating...' : 'Use Template' }}
          </button>
        </div>
      </div>
    </div>

    <!-- SECTION D — Recommended Skills -->
    <div v-if="personaData?.recommended_skills?.length">
      <h2 class="text-lg font-semibold mb-3">Recommended Skills</h2>
      <div class="flex gap-4 overflow-x-auto pb-2">
        <router-link
          v-for="s in personaData.recommended_skills"
          :key="s.skill_id"
          :to="`/skills`"
          class="flex-shrink-0 w-56 card hover:shadow-md transition-shadow cursor-pointer"
        >
          <h3 class="font-semibold text-sm mb-1">{{ s.name }}</h3>
          <p class="text-xs text-gray-500 mb-3 line-clamp-2">{{ s.description }}</p>
          <div class="flex items-center justify-between">
            <span :class="['badge', categoryColors[s.category] || 'bg-gray-100 text-gray-600']">
              {{ s.category }}
            </span>
            <span class="text-xs text-gray-400">{{ s.usage_count }} uses</span>
          </div>
        </router-link>
      </div>
    </div>

    <!-- SECTION E — Recommended Connectors -->
    <div v-if="personaData?.default_connectors?.length">
      <h2 class="text-lg font-semibold mb-3">Recommended Connectors</h2>
      <div class="flex gap-4 overflow-x-auto pb-2">
        <div
          v-for="c in personaData.default_connectors"
          :key="c.connector_id"
          class="flex-shrink-0 w-56 card"
        >
          <h3 class="font-semibold text-sm mb-1">{{ c.name }}</h3>
          <div class="flex items-center gap-2 mb-3">
            <span class="badge bg-purple-100 text-purple-700">{{ c.category }}</span>
            <span class="badge bg-gray-100 text-gray-600">{{ c.type }}</span>
          </div>
          <p class="text-xs text-gray-400 mb-3">
            Auth: {{ Array.isArray(c.auth_methods) ? c.auth_methods.join(', ') : c.auth_methods }}
          </p>
          <button class="btn-secondary text-xs w-full">Connect</button>
        </div>
      </div>
    </div>

    <!-- SECTION F — Quick Stats (KPI Cards) -->
    <div>
      <h2 class="text-lg font-semibold mb-3">Quick Stats</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div class="card !p-4">
          <p class="text-xs text-gray-500">Agents</p>
          <p class="text-2xl font-bold text-brand-600 mt-1">{{ totalAgents }}</p>
          <div v-if="summary?.agents_by_status?.length" class="flex flex-wrap gap-1 mt-2">
            <span
              v-for="s in summary.agents_by_status"
              :key="s.status"
              class="text-[10px] text-gray-400"
            >{{ s.count }} {{ s.status }}</span>
          </div>
        </div>
        <div class="card !p-4">
          <p class="text-xs text-gray-500">Skills</p>
          <p class="text-2xl font-bold text-brand-600 mt-1">{{ summary?.total_skills ?? '—' }}</p>
        </div>
        <div class="card !p-4">
          <p class="text-xs text-gray-500">Connectors</p>
          <p class="text-2xl font-bold text-brand-600 mt-1">{{ summary?.total_connectors ?? '—' }}</p>
        </div>
        <div class="card !p-4">
          <p class="text-xs text-gray-500">Users</p>
          <p class="text-2xl font-bold text-brand-600 mt-1">{{ summary?.total_users ?? '—' }}</p>
        </div>
        <div class="card !p-4">
          <p class="text-xs text-gray-500">Runs (30d)</p>
          <p class="text-2xl font-bold text-brand-600 mt-1">{{ summary?.last_30_days?.total_runs ?? '—' }}</p>
          <p v-if="summary?.last_30_days?.success_rate" class="text-xs text-green-600 mt-1">
            {{ summary.last_30_days.success_rate }}% success
          </p>
        </div>
        <div class="card !p-4">
          <p class="text-xs text-gray-500">Tokens (30d)</p>
          <p class="text-2xl font-bold text-brand-600 mt-1">{{ summary?.last_30_days?.total_tokens?.toLocaleString() ?? '—' }}</p>
          <p v-if="summary?.last_30_days?.total_cost" class="text-xs text-gray-400 mt-1">
            ${{ Number(summary.last_30_days.total_cost).toFixed(2) }}
          </p>
        </div>
      </div>
    </div>

    <!-- SECTION G — Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <!-- Skill Reuse Leaderboard -->
      <div class="card">
        <h2 class="text-base font-semibold mb-4">Skill Reuse Leaderboard</h2>
        <div v-if="skillReuse.length">
          <BarChart
            :labels="skillChartLabels"
            :datasets="skillChartDatasets"
            :horizontal="true"
            :height="Math.max(180, skillReuse.length * 40)"
          />
          <div class="mt-4 divide-y divide-gray-100">
            <div
              v-for="(s, i) in skillReuse"
              :key="s.skill_id"
              class="flex items-center justify-between py-2"
            >
              <div class="flex items-center gap-3">
                <span class="text-xs font-bold text-gray-400 w-5">{{ i + 1 }}</span>
                <div>
                  <p class="text-sm font-medium">{{ s.name }}</p>
                  <span :class="['badge text-[10px]', categoryColors[s.category] || 'bg-gray-100 text-gray-600']">{{ s.category }}</span>
                </div>
              </div>
              <div class="text-right">
                <p class="text-sm font-semibold text-brand-600">{{ s.agents_using }} agents</p>
                <p class="text-xs text-gray-400">{{ s.usage_count || 0 }} total uses</p>
              </div>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-gray-400">No skill usage data yet.</p>
      </div>

      <!-- Persona Adoption -->
      <div class="card">
        <h2 class="text-base font-semibold mb-4">Persona Adoption</h2>
        <div v-if="personaAdoption.length">
          <BarChart
            :labels="personaChartLabels"
            :datasets="personaChartDatasets"
            :height="220"
          />
          <div class="mt-4 divide-y divide-gray-100">
            <div
              v-for="p in personaAdoption"
              :key="p.persona"
              class="flex items-center justify-between py-2"
            >
              <div class="flex items-center gap-3">
                <span class="text-2xl">{{ p.icon || '👤' }}</span>
                <div>
                  <p class="text-sm font-medium">{{ p.persona }}</p>
                  <p class="text-xs text-gray-400">{{ p.department || '—' }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-sm">
                  <span class="font-semibold text-purple-600">{{ p.agents_created }}</span>
                  <span class="text-gray-400 mx-1">agents</span>
                  <span class="font-semibold text-cyan-600">{{ p.total_runs }}</span>
                  <span class="text-gray-400">runs</span>
                </p>
                <p class="text-xs text-gray-400">{{ p.users }} user{{ p.users !== 1 ? 's' : '' }}</p>
              </div>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-gray-400">No persona adoption data yet.</p>
      </div>

    </div>

  </div>
</template>
