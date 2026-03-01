<script setup>
import { ref, onMounted } from 'vue'
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

onMounted(() => store.fetchAll())

const tierBadge = (tier) => ({
  'no-code': 'badge-nocode',
  'low-code': 'badge-lowcode',
  'pro-code': 'badge-procode',
}[tier] || '')

function parseJson(val) {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') { try { return JSON.parse(val) } catch { return [] } }
  return []
}

async function forkTemplate(t) {
  forkingId.value = t.template_id
  try {
    const res = await api.post(`/templates/${t.template_id}/fork`, {
      workspace_id: auth.user.workspace_id,
      user_id: auth.user.user_id,
    })
    showToast(`Agent created from "${t.name}"`, 'success')
    router.push(`/agents/${res.data.agent_id}`)
  } catch (err) {
    console.error('Fork failed:', err)
    showToast('Failed to fork template', 'error')
  } finally {
    forkingId.value = null
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <p class="text-sm text-gray-500">{{ store.items.length }} templates available</p>
    </div>

    <div v-if="store.loading" class="py-4">
      <SkeletonLoader type="card" :lines="6" />
    </div>

    <div v-else-if="store.items.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="t in store.items"
        :key="t.template_id"
        class="card flex flex-col justify-between"
      >
        <div>
          <div class="flex items-start justify-between mb-2">
            <h3 class="font-semibold text-sm">{{ t.name }}</h3>
            <span :class="['badge', tierBadge(t.builder_tier)]">{{ t.builder_tier }}</span>
          </div>
          <p class="text-sm text-gray-500 mb-4 line-clamp-2">{{ t.description }}</p>

          <!-- Required skills -->
          <div v-if="parseJson(t.required_skills).length" class="mb-2">
            <p class="text-xs text-gray-400 mb-1">Skills</p>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="s in parseJson(t.required_skills)"
                :key="s"
                class="badge bg-blue-100 text-blue-700"
              >{{ s }}</span>
            </div>
          </div>

          <!-- Required connectors -->
          <div v-if="parseJson(t.required_connectors).length" class="mb-3">
            <p class="text-xs text-gray-400 mb-1">Connectors</p>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="c in parseJson(t.required_connectors)"
                :key="c"
                class="badge bg-purple-100 text-purple-700"
              >{{ c }}</span>
            </div>
          </div>

          <div class="flex items-center justify-between text-xs text-gray-400">
            <span class="badge bg-gray-100 text-gray-600">{{ t.category }}</span>
            <span>{{ t.fork_count || 0 }} forks</span>
          </div>
        </div>

        <button
          class="btn-primary text-sm mt-4 w-full"
          :disabled="forkingId === t.template_id"
          @click="forkTemplate(t)"
        >
          {{ forkingId === t.template_id ? 'Creating agent...' : 'Use This Template' }}
        </button>
      </div>
    </div>

    <div v-else class="card text-center py-16">
      <p class="text-4xl mb-3">📋</p>
      <p class="text-gray-500 font-medium">No templates yet</p>
      <p class="text-xs text-gray-400 mt-1">Create templates to help your team get started faster</p>
    </div>
  </div>
</template>
