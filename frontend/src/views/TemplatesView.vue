<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTemplatesStore } from '../stores'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'
import SkeletonLoader from '../components/SkeletonLoader.vue'
import api from '../api/client'

const store = useTemplatesStore()
const auth = useAuthStore()
const router = useRouter()
const { showToast } = useToast()

const forkingId = ref(null)
const activeCategory = ref('all')

const categories = [
  { key: 'all',       label: 'All' },
  { key: 'sales',     label: 'Sales' },
  { key: 'support',   label: 'Support' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'knowledge', label: 'Knowledge' },
  { key: 'ops',       label: 'Operations' },
  { key: 'hr',        label: 'HR' },
]

const categoryCount = (key) => {
  if (key === 'all') return store.items.length
  return store.items.filter(t => t.category === key).length
}

const filteredTemplates = computed(() => {
  if (activeCategory.value === 'all') return store.items
  return store.items.filter(t => t.category === activeCategory.value)
})

onMounted(() => store.fetchAll())

const tierBadgeClass = (tier) => ({
  'no-code': 'bg-green-100 text-green-700',
  'low-code': 'bg-orange-100 text-orange-700',
  'pro-code': 'bg-red-100 text-red-700',
}[tier] || 'bg-gray-100 text-gray-600')

const categoryBadgeClass = (cat) => ({
  sales: 'bg-blue-100 text-blue-700',
  support: 'bg-orange-100 text-orange-700',
  analytics: 'bg-purple-100 text-purple-700',
  knowledge: 'bg-green-100 text-green-700',
  ops: 'bg-indigo-100 text-indigo-700',
  hr: 'bg-pink-100 text-pink-700',
  finance: 'bg-amber-100 text-amber-700',
}[cat] || 'bg-gray-100 text-gray-600')

async function forkTemplate(t) {
  forkingId.value = t.template_id
  try {
    const res = await api.post(`/templates/${t.template_id}/fork`, {
      workspace_id: auth.user.workspace_id,
      user_id: auth.user.user_id,
      org_id: auth.user.org_id,
    })
    showToast(`Agent created from "${t.name}"`, 'success')
    router.push(`/agents/${res.data.agent_id}`)
  } catch (err) {
    console.error('Fork failed:', err)
    showToast('Failed to create agent from template', 'error')
  } finally {
    forkingId.value = null
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-xl font-bold text-gray-800">Template Gallery</h1>
      <p class="text-sm text-gray-500 mt-1">Pre-built agent blueprints. Fork, customize, and deploy in minutes.</p>
    </div>

    <!-- Category Filter Tabs -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="flex gap-4 -mb-px">
        <button
          v-for="cat in categories"
          :key="cat.key"
          :class="[
            'pb-3 text-sm font-medium border-b-2 transition-colors',
            activeCategory === cat.key
              ? 'border-brand-500 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          ]"
          @click="activeCategory = cat.key"
        >
          {{ cat.label }}
          <span class="ml-1 text-xs text-gray-400">({{ categoryCount(cat.key) }})</span>
        </button>
      </nav>
    </div>

    <div v-if="store.loading" class="py-4">
      <SkeletonLoader type="card" :lines="6" />
    </div>

    <div v-else-if="filteredTemplates.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="t in filteredTemplates"
        :key="t.template_id"
        class="card flex flex-col justify-between"
      >
        <div>
          <div class="flex items-start justify-between mb-2">
            <h3 class="font-semibold text-gray-800">{{ t.name }}</h3>
            <span :class="['badge', tierBadgeClass(t.builder_tier)]">{{ t.builder_tier }}</span>
          </div>

          <span :class="['badge text-[10px] mb-3 inline-block', categoryBadgeClass(t.category)]">{{ t.category }}</span>

          <p class="text-sm text-gray-500 mb-4 line-clamp-3">{{ t.description }}</p>

          <!-- Includes section -->
          <div class="space-y-2 mb-3">
            <div v-if="t.skills?.length">
              <p class="text-[10px] uppercase tracking-wider text-gray-400 mb-1 font-semibold">Skills</p>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="s in t.skills"
                  :key="s.skill_id"
                  class="inline-flex items-center gap-1 badge bg-blue-50 text-blue-600 text-[11px]"
                >&#9889; {{ s.name }}</span>
              </div>
            </div>
            <div v-if="t.connectors?.length">
              <p class="text-[10px] uppercase tracking-wider text-gray-400 mb-1 font-semibold">Connectors</p>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="c in t.connectors"
                  :key="c.connector_id"
                  class="inline-flex items-center gap-1 badge bg-purple-50 text-purple-600 text-[11px]"
                >&#128268; {{ c.name }}</span>
              </div>
            </div>
          </div>

          <div class="text-xs text-gray-400">
            {{ t.fork_count || 0 }} forks
          </div>
        </div>

        <button
          class="btn-primary text-sm mt-4 w-full"
          :disabled="forkingId === t.template_id"
          @click.stop="forkTemplate(t)"
        >
          {{ forkingId === t.template_id ? 'Creating agent...' : 'Use This Template' }}
        </button>
      </div>
    </div>

    <div v-else class="card text-center py-16">
      <p class="text-4xl mb-3">&#128203;</p>
      <p class="text-gray-500 font-medium">No templates in this category</p>
      <p class="text-xs text-gray-400 mt-1">Try selecting a different category above</p>
    </div>
  </div>
</template>
