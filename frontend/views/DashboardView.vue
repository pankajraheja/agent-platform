<script setup>
import { ref, onMounted } from 'vue'
import api from '../api/client'

const summary = ref(null)
const personaAdoption = ref([])
const skillReuse = ref([])
const loading = ref(true)

// TODO: Replace with actual org_id from auth context
const ORG_ID = null

onMounted(async () => {
  try {
    if (!ORG_ID) {
      // When no org is set yet, show placeholder data
      summary.value = {
        total_users: '—',
        total_skills: '—',
        total_connectors: '—',
        agents_by_status: [],
        last_30_days: { total_runs: '—', success_rate: '—', total_cost: '—' },
      }
      return
    }
    const [s, pa, sr] = await Promise.all([
      api.get('/dashboard/summary', { params: { org_id: ORG_ID } }),
      api.get('/dashboard/persona-adoption', { params: { org_id: ORG_ID } }),
      api.get('/dashboard/skill-reuse', { params: { org_id: ORG_ID } }),
    ])
    summary.value = s.data
    personaAdoption.value = pa.data
    skillReuse.value = sr.data
  } catch (err) {
    console.error('Dashboard load error:', err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="card">
        <p class="text-sm text-gray-500">Total Users</p>
        <p class="text-3xl font-bold text-brand-600 mt-1">{{ summary?.total_users ?? '—' }}</p>
      </div>
      <div class="card">
        <p class="text-sm text-gray-500">Skills Created</p>
        <p class="text-3xl font-bold text-brand-600 mt-1">{{ summary?.total_skills ?? '—' }}</p>
      </div>
      <div class="card">
        <p class="text-sm text-gray-500">Active Connectors</p>
        <p class="text-3xl font-bold text-brand-600 mt-1">{{ summary?.total_connectors ?? '—' }}</p>
      </div>
      <div class="card">
        <p class="text-sm text-gray-500">Runs (30d)</p>
        <p class="text-3xl font-bold text-brand-600 mt-1">{{ summary?.last_30_days?.total_runs ?? '—' }}</p>
        <p class="text-xs text-gray-400 mt-1">
          {{ summary?.last_30_days?.success_rate ? `${summary.last_30_days.success_rate}% success` : '' }}
        </p>
      </div>
    </div>

    <!-- Two-column layout -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Persona Adoption -->
      <div class="card">
        <h2 class="text-lg font-semibold mb-4">Persona Adoption</h2>
        <div v-if="personaAdoption.length" class="space-y-3">
          <div
            v-for="p in personaAdoption"
            :key="p.persona"
            class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
          >
            <div class="flex items-center gap-2">
              <span class="text-lg">{{ p.icon }}</span>
              <div>
                <p class="font-medium text-sm">{{ p.persona }}</p>
                <p class="text-xs text-gray-400">{{ p.department }}</p>
              </div>
            </div>
            <div class="text-right text-sm">
              <p>{{ p.users }} users</p>
              <p class="text-xs text-gray-400">{{ p.total_runs }} runs</p>
            </div>
          </div>
        </div>
        <p v-else class="text-gray-400 text-sm">Connect your org to see persona adoption metrics</p>
      </div>

      <!-- Skill Reuse Leaderboard -->
      <div class="card">
        <h2 class="text-lg font-semibold mb-4">Top Reused Skills</h2>
        <div v-if="skillReuse.length" class="space-y-3">
          <div
            v-for="(s, i) in skillReuse.slice(0, 8)"
            :key="s.skill_id"
            class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
          >
            <div class="flex items-center gap-3">
              <span class="text-xs font-bold text-gray-400 w-4">{{ i + 1 }}</span>
              <div>
                <p class="font-medium text-sm">{{ s.name }}</p>
                <span class="badge bg-gray-100 text-gray-600">{{ s.category }}</span>
              </div>
            </div>
            <div class="text-right text-sm">
              <p>{{ s.agents_using }} agents</p>
              <p class="text-xs text-gray-400">{{ s.usage_count }} total uses</p>
            </div>
          </div>
        </div>
        <p v-else class="text-gray-400 text-sm">Skills reuse data will appear as agents are built</p>
      </div>
    </div>
  </div>
</template>
