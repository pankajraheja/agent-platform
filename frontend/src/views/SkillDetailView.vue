<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '../composables/useToast'
import SkeletonLoader from '../components/SkeletonLoader.vue'
import PromptStudio from '../components/PromptStudio.vue'
import api from '../api/client'

const route = useRoute()
const router = useRouter()
const { showToast } = useToast()
const skillId = route.params.id

const skill = ref(null)
const versions = ref([])
const selectedVersion = ref(null)
const loading = ref(true)
const publishing = ref(false)

const publishedVersion = computed(() => versions.value.find(v => v.status === 'published'))

const statusBadge = (status) => ({
  published:  'bg-green-100 text-green-700',
  draft:      'bg-amber-100 text-amber-700',
  deprecated: 'bg-gray-100 text-gray-500',
}[status] || 'bg-gray-100 text-gray-600')

async function fetchSkill() {
  loading.value = true
  try {
    const [skillRes, versionsRes] = await Promise.all([
      api.get(`/skills/${skillId}`),
      api.get(`/skills/${skillId}/versions`),
    ])
    skill.value = skillRes.data
    versions.value = versionsRes.data

    // Auto-select published version, or first available
    if (publishedVersion.value) {
      selectedVersion.value = publishedVersion.value
    } else if (versions.value.length) {
      selectedVersion.value = versions.value[0]
    }
  } catch (err) {
    console.error('Failed to load skill:', err)
  } finally {
    loading.value = false
  }
}

function selectVersion(v) {
  selectedVersion.value = v
}

async function publishVersion(v) {
  publishing.value = true
  try {
    await api.post(`/skills/${skillId}/versions/${v.skill_version_id}/publish`)
    // Refresh versions
    const res = await api.get(`/skills/${skillId}/versions`)
    versions.value = res.data
    // Select the newly published version
    selectedVersion.value = versions.value.find(ver => ver.skill_version_id === v.skill_version_id) || versions.value[0]
    showToast(`v${v.version_number} published successfully`, 'success')
  } catch (err) {
    console.error('Publish failed:', err)
    showToast('Failed to publish version', 'error')
  } finally {
    publishing.value = false
  }
}

onMounted(fetchSkill)
</script>

<template>
  <div v-if="loading" class="space-y-6">
    <SkeletonLoader type="list" :lines="1" />
    <SkeletonLoader type="table" :lines="4" />
  </div>

  <div v-else-if="!skill" class="text-center py-20">
    <p class="text-4xl mb-3">⚡</p>
    <p class="text-gray-500 font-medium">Skill not found</p>
    <button class="btn-primary text-sm mt-4" @click="router.push('/skills')">Back to Skills</button>
  </div>

  <div v-else class="space-y-6">
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-1.5 text-sm">
      <router-link to="/skills" class="text-gray-400 hover:text-brand-600 transition-colors">Skills</router-link>
      <span class="text-gray-300">/</span>
      <span class="text-gray-700 font-medium">{{ skill.name }}</span>
    </nav>

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-800">{{ skill.name }}</h1>
        <p v-if="skill.description" class="text-sm text-gray-500 mt-1">{{ skill.description }}</p>
      </div>
      <div class="flex items-center gap-3">
        <span class="badge bg-blue-100 text-blue-700">{{ skill.category }}</span>
        <span class="badge bg-gray-100 text-gray-600">{{ skill.visibility }}</span>
      </div>
    </div>

    <!-- Stats bar -->
    <div class="flex items-center gap-6 text-sm text-gray-500">
      <div class="flex items-center gap-1.5">
        <span class="font-semibold text-gray-700">{{ skill.usage_count || 0 }}</span> uses
      </div>
      <div class="flex items-center gap-1.5">
        <span class="font-semibold text-gray-700">{{ skill.avg_rating > 0 ? `⭐ ${skill.avg_rating}` : '—' }}</span> rating
      </div>
      <div class="flex items-center gap-1.5">
        <span class="font-semibold text-gray-700">{{ versions.length }}</span> versions
      </div>
    </div>

    <!-- Main content: Version sidebar + Prompt Studio -->
    <div class="grid grid-cols-12 gap-6">
      <!-- Version Sidebar -->
      <div class="col-span-3">
        <div class="card p-0">
          <div class="px-4 py-3 border-b border-gray-100">
            <h3 class="text-sm font-semibold text-gray-700">Versions</h3>
          </div>
          <div class="divide-y divide-gray-100">
            <div
              v-for="v in versions"
              :key="v.skill_version_id"
              class="px-4 py-3 cursor-pointer transition-colors"
              :class="selectedVersion?.skill_version_id === v.skill_version_id ? 'bg-brand-50 border-l-2 border-brand-500' : 'hover:bg-gray-50 border-l-2 border-transparent'"
              @click="selectVersion(v)"
            >
              <div class="flex items-center justify-between">
                <span class="text-sm font-mono font-medium">v{{ v.version_number }}</span>
                <span :class="['text-[10px] px-1.5 py-0.5 rounded-full font-medium', statusBadge(v.status)]">
                  {{ v.status }}
                </span>
              </div>
              <p class="text-xs text-gray-400 mt-1">{{ new Date(v.created_at).toLocaleDateString() }}</p>

              <!-- Publish button for drafts -->
              <button
                v-if="v.status === 'draft'"
                class="btn-primary text-xs mt-2 w-full"
                :disabled="publishing"
                @click.stop="publishVersion(v)"
              >
                {{ publishing ? 'Publishing...' : 'Publish' }}
              </button>
            </div>
          </div>
          <div v-if="!versions.length" class="px-4 py-6 text-center">
            <p class="text-sm text-gray-400">No versions yet</p>
          </div>
        </div>
      </div>

      <!-- Prompt Studio -->
      <div class="col-span-9">
        <div class="card">
          <h3 class="text-base font-semibold mb-4">Prompt Studio</h3>
          <PromptStudio
            v-if="selectedVersion"
            :skill-id="skillId"
            :version="selectedVersion"
          />
          <div v-else class="text-center py-10">
            <p class="text-2xl mb-2">📝</p>
            <p class="text-sm text-gray-400">Select a version to view and test its prompt configuration</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
