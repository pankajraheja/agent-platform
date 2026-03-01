<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSkillsStore } from '../stores'
import PromptStudio from '../components/PromptStudio.vue'
import VersionTimeline from '../components/VersionTimeline.vue'
import SkillCreateModal from '../components/SkillCreateModal.vue'

const route = useRoute()
const router = useRouter()
const store = useSkillsStore()

const skillId = computed(() => route.params.id)
const showEditModal = ref(false)
const activeTab = ref('studio')
const selectedVersion = ref(null)

// ----- Tabs -----
const tabs = [
  { key: 'studio',  label: 'Prompt Studio', icon: '⚡' },
  { key: 'usage',   label: 'Usage & Agents', icon: '📊' },
  { key: 'compose', label: 'Composition',   icon: '🧩' },
]

// ----- Load Data -----
onMounted(async () => {
  await store.fetchDetail(skillId.value)
  await store.fetchStats(skillId.value)
  // Auto-select published version or first version
  if (store.versions.length > 0) {
    selectedVersion.value = store.publishedVersion || store.versions[0]
  }
})

onUnmounted(() => store.clearCurrent())

// ----- Version Actions -----
async function handleCreateVersion() {
  const nextNum = store.versions.length > 0
    ? `${parseInt(store.versions[0].version_number?.split('.')[0] || '0') + 1}.0.0`
    : '1.0.0'

  const newVersion = await store.createVersion(skillId.value, {
    version_number: nextNum,
    prompt_config: JSON.stringify(
      selectedVersion.value?.prompt_config || { system_prompt: '', user_template: '' }
    ),
    model_settings: JSON.stringify(
      selectedVersion.value?.model_settings || { model: 'gpt-4o-mini', temperature: 0.7, max_tokens: 1024 }
    ),
    status: 'draft',
  })
  selectedVersion.value = newVersion
}

async function handleSaveVersion(data) {
  if (!selectedVersion.value) return
  const updated = await store.updateVersion(
    skillId.value,
    selectedVersion.value.skill_version_id,
    data
  )
  selectedVersion.value = updated
}

async function handlePublish() {
  if (!selectedVersion.value) return
  await store.publishVersion(skillId.value, selectedVersion.value.skill_version_id)
  selectedVersion.value = store.publishedVersion || selectedVersion.value
}

async function handleTest(input) {
  await store.testSkill(
    skillId.value,
    input,
    selectedVersion.value?.skill_version_id
  )
}

async function handleEditSkill(data) {
  await store.update(skillId.value, data)
  showEditModal.value = false
}

async function handleDelete() {
  if (!confirm('Delete this skill? This cannot be undone.')) return
  await store.remove(skillId.value)
  router.push('/skills')
}
</script>

<template>
  <div v-if="store.loading && !store.current" class="text-center py-12 text-gray-400">
    Loading skill...
  </div>

  <div v-else-if="store.current" class="space-y-6">
    <!-- Breadcrumb + Header -->
    <div>
      <button @click="router.push('/skills')" class="text-sm text-gray-400 hover:text-gray-600 mb-2 inline-flex items-center gap-1">
        ← Back to Skills
      </button>

      <div class="flex items-start justify-between">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold text-gray-900">{{ store.current.name }}</h1>
            <span class="badge bg-blue-100 text-blue-700">{{ store.current.category }}</span>
            <span :class="[
              'badge',
              store.current.visibility === 'org' ? 'bg-purple-100 text-purple-700' :
              store.current.visibility === 'public' ? 'bg-green-100 text-green-700' :
              'bg-gray-100 text-gray-600'
            ]">{{ store.current.visibility }}</span>
          </div>
          <p class="text-sm text-gray-500 mt-1">{{ store.current.description }}</p>
        </div>

        <div class="flex items-center gap-2">
          <button @click="showEditModal = true" class="btn-secondary text-sm">Edit</button>
          <button @click="handleDelete" class="text-sm px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Stats Bar -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
      <div class="card py-3 text-center">
        <p class="text-2xl font-bold text-brand-600">{{ store.current.usage_count || 0 }}</p>
        <p class="text-xs text-gray-400">Total Uses</p>
      </div>
      <div class="card py-3 text-center">
        <p class="text-2xl font-bold text-brand-600">{{ store.stats?.agents_using || 0 }}</p>
        <p class="text-xs text-gray-400">Agents Using</p>
      </div>
      <div class="card py-3 text-center">
        <p class="text-2xl font-bold text-brand-600">{{ store.versions.length }}</p>
        <p class="text-xs text-gray-400">Versions</p>
      </div>
      <div class="card py-3 text-center">
        <p class="text-2xl font-bold text-brand-600">{{ store.stats?.success_rate ?? '—' }}{{ store.stats?.success_rate ? '%' : '' }}</p>
        <p class="text-xs text-gray-400">Success Rate</p>
      </div>
      <div class="card py-3 text-center">
        <p class="text-2xl font-bold text-brand-600">{{ store.stats?.avg_latency_ms ? `${store.stats.avg_latency_ms}ms` : '—' }}</p>
        <p class="text-xs text-gray-400">Avg Latency</p>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="border-b border-gray-200">
      <div class="flex gap-6">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          :class="[
            'pb-3 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === tab.key
              ? 'text-brand-600 border-brand-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          ]"
        >
          {{ tab.icon }} {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Tab Content -->

    <!-- PROMPT STUDIO TAB -->
    <div v-if="activeTab === 'studio'" class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Version Sidebar -->
      <div class="lg:col-span-1">
        <div class="card">
          <VersionTimeline
            :versions="store.versions"
            :selected-id="selectedVersion?.skill_version_id"
            :saving="store.saving"
            @select="selectedVersion = $event"
            @create="handleCreateVersion"
          />
        </div>
      </div>

      <!-- Prompt Studio Main -->
      <div class="lg:col-span-3">
        <div class="card">
          <PromptStudio
            :version="selectedVersion"
            :testing="store.testing"
            :test-result="store.testResult"
            :saving="store.saving"
            @save-version="handleSaveVersion"
            @run-test="handleTest"
            @publish="handlePublish"
          />
        </div>
      </div>
    </div>

    <!-- USAGE TAB -->
    <div v-else-if="activeTab === 'usage'" class="space-y-6">
      <!-- Agents Using This Skill -->
      <div class="card">
        <h3 class="text-sm font-semibold text-gray-700 mb-4">Agents Using This Skill</h3>
        <div v-if="store.current.agents_using?.length" class="space-y-2">
          <div
            v-for="agent in store.current.agents_using"
            :key="agent.agent_id"
            class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
          >
            <div class="flex items-center gap-3">
              <span class="text-lg">🤖</span>
              <div>
                <p class="text-sm font-medium">{{ agent.name }}</p>
                <p class="text-xs text-gray-400">Step {{ agent.execution_order + 1 }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span :class="[
                'badge',
                agent.builder_tier === 'no-code' ? 'badge-nocode' :
                agent.builder_tier === 'low-code' ? 'badge-lowcode' : 'badge-procode'
              ]">{{ agent.builder_tier }}</span>
              <span class="inline-flex items-center gap-1 text-xs">
                <span :class="[
                  'w-2 h-2 rounded-full',
                  agent.status === 'active' ? 'bg-green-400' : 'bg-gray-300'
                ]" />
                {{ agent.status }}
              </span>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-gray-400 text-center py-6">
          No agents are using this skill yet
        </p>
      </div>

      <!-- Used In Other Skills (Composition) -->
      <div class="card">
        <h3 class="text-sm font-semibold text-gray-700 mb-4">Used In Skills (as child)</h3>
        <div v-if="store.current.used_in_skills?.length" class="flex flex-wrap gap-2">
          <span
            v-for="parent in store.current.used_in_skills"
            :key="parent.skill_id"
            @click="router.push(`/skills/${parent.skill_id}`)"
            class="badge bg-purple-100 text-purple-700 cursor-pointer hover:bg-purple-200 transition-colors"
          >
            {{ parent.name }}
          </span>
        </div>
        <p v-else class="text-sm text-gray-400 text-center py-6">
          Not composed into any other skills
        </p>
      </div>
    </div>

    <!-- COMPOSITION TAB -->
    <div v-else-if="activeTab === 'compose'" class="card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-gray-700">Child Skills (Skill Chain)</h3>
        <button class="text-xs text-brand-600 hover:text-brand-700 font-medium">
          + Add Child Skill
        </button>
      </div>
      <div v-if="store.current.child_skills?.length" class="space-y-2">
        <div
          v-for="(child, i) in store.current.child_skills"
          :key="child.skill_id"
          class="flex items-center gap-3 py-2 px-3 rounded-lg border border-gray-100"
        >
          <span class="text-xs font-bold text-gray-400 w-6 text-center">{{ i + 1 }}</span>
          <div class="flex-1">
            <p class="text-sm font-medium">{{ child.name }}</p>
            <span class="badge bg-blue-100 text-blue-700 text-xs">{{ child.category }}</span>
          </div>
          <span class="text-gray-300">→</span>
        </div>
      </div>
      <div v-else class="text-center py-12 text-gray-400">
        <p class="text-4xl mb-3">🧩</p>
        <p class="text-sm mb-1">No child skills configured</p>
        <p class="text-xs">Chain multiple skills together to create complex workflows</p>
      </div>
    </div>

    <!-- Edit Modal -->
    <SkillCreateModal
      :show="showEditModal"
      :skill="store.current"
      @close="showEditModal = false"
      @save="handleEditSkill"
    />
  </div>

  <div v-else class="text-center py-12 text-gray-400">
    Skill not found
  </div>
</template>
