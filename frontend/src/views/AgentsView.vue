<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAgentsStore } from '../stores'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const store = useAgentsStore()
const auth = useAuthStore()
const router = useRouter()
const { showToast } = useToast()

const showCreate = ref(false)
const createForm = ref({ name: '', description: '', builder_tier: 'no-code' })
const creating = ref(false)

onMounted(() => store.fetchAll())

const tierBadgeClass = (tier) => ({
  'no-code': 'bg-green-100 text-green-700',
  'low-code': 'bg-orange-100 text-orange-700',
  'pro-code': 'bg-red-100 text-red-700',
}[tier] || 'bg-gray-100 text-gray-600')

const statusDotClass = (status) => ({
  active: 'bg-green-400',
  draft: 'bg-yellow-400',
  paused: 'bg-orange-400',
  retired: 'bg-red-400',
}[status] || 'bg-gray-300')

async function handleCreate() {
  creating.value = true
  try {
    const agent = await store.create({
      workspace_id: auth.user.workspace_id,
      name: createForm.value.name,
      description: createForm.value.description,
      builder_tier: createForm.value.builder_tier,
      created_by: auth.user.user_id,
    })
    showCreate.value = false
    createForm.value = { name: '', description: '', builder_tier: 'no-code' }
    showToast(`Agent "${agent.name}" created`, 'success')
    router.push(`/agents/${agent.agent_id}`)
  } catch (err) {
    console.error('Create failed:', err)
    showToast('Failed to create agent', 'error')
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <p class="text-sm text-gray-500">{{ store.items.length }} agents</p>
      <div class="flex items-center gap-3">
        <router-link to="/templates" class="btn-secondary text-sm">Browse Templates</router-link>
        <button class="btn-primary text-sm" @click="showCreate = true">+ New Agent</button>
      </div>
    </div>

    <div v-if="store.loading" class="py-4">
      <SkeletonLoader type="card" :lines="4" />
    </div>

    <div v-else-if="store.items.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="a in store.items"
        :key="a.agent_id"
        class="card hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between"
        @click="router.push(`/agents/${a.agent_id}`)"
      >
        <div>
          <div class="flex items-start justify-between mb-2">
            <h3 class="font-semibold text-gray-800 text-sm">{{ a.name }}</h3>
            <span class="inline-flex items-center gap-1.5 text-xs font-medium shrink-0"
              :class="a.status === 'active' ? 'text-green-600' : a.status === 'draft' ? 'text-yellow-600' : 'text-gray-400'"
            >
              <span class="w-2 h-2 rounded-full" :class="statusDotClass(a.status)" />
              {{ a.status }}
            </span>
          </div>
          <p class="text-xs text-gray-500 mb-3 line-clamp-2">{{ a.description || 'No description' }}</p>
          <span :class="['badge', tierBadgeClass(a.builder_tier)]">{{ a.builder_tier }}</span>
        </div>
        <div class="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
          <span>{{ a.created_at ? new Date(a.created_at).toLocaleDateString() : '' }}</span>
          <span v-if="a.metadata?.forked_from" class="inline-flex items-center gap-1 text-brand-600">
            &#128203; from template
          </span>
        </div>
      </div>
    </div>

    <div v-else class="card text-center py-16">
      <p class="text-4xl mb-3">&#129302;</p>
      <p class="text-gray-500 font-medium">No agents yet</p>
      <p class="text-xs text-gray-400 mt-1">Create your first agent or start from a template</p>
      <div class="flex items-center justify-center gap-3 mt-4">
        <router-link to="/templates" class="btn-secondary text-sm">Browse Templates</router-link>
        <button class="btn-primary text-sm" @click="showCreate = true">+ New Agent</button>
      </div>
    </div>

    <!-- Create Agent Modal -->
    <Teleport to="body">
      <div v-if="showCreate" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="showCreate = false">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md">
          <div class="flex items-center justify-between px-6 py-4 border-b">
            <h3 class="font-semibold">New Agent</h3>
            <button class="text-gray-400 hover:text-gray-600" @click="showCreate = false">&times;</button>
          </div>
          <form @submit.prevent="handleCreate" class="p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                v-model="createForm.name"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="My Agent"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                v-model="createForm.description"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="What does this agent do?"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Builder Tier</label>
              <select
                v-model="createForm.builder_tier"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="no-code">No-Code</option>
                <option value="low-code">Low-Code</option>
                <option value="pro-code">Pro-Code</option>
              </select>
            </div>
            <div class="flex justify-end gap-3 pt-2">
              <button type="button" class="btn-secondary text-sm" @click="showCreate = false">Cancel</button>
              <button type="submit" class="btn-primary text-sm" :disabled="creating || !createForm.name">
                {{ creating ? 'Creating...' : 'Create Agent' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
