<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import EntityTable from '../components/EntityTable.vue'
import { useAgentsStore } from '../stores'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'

const store = useAgentsStore()
const auth = useAuthStore()
const router = useRouter()
const { showToast } = useToast()

const showCreate = ref(false)
const createForm = ref({ name: '', description: '', builder_tier: 'no-code' })
const creating = ref(false)

onMounted(() => store.fetchAll())

const columns = [
  { key: 'name', label: 'Agent Name' },
  { key: 'builder_tier', label: 'Tier' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Created', format: (v) => v ? new Date(v).toLocaleDateString() : '—' },
]

const tierBadge = (tier) => ({
  'no-code': 'badge-nocode',
  'low-code': 'badge-lowcode',
  'pro-code': 'badge-procode',
}[tier] || '')

function handleRowClick(item) {
  router.push(`/agents/${item.agent_id}`)
}

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
  <EntityTable
    :columns="columns"
    :items="store.items"
    :loading="store.loading"
    create-label="New Agent"
    empty-message="No agents yet. Create your first one!"
    empty-icon="🤖"
    @create="showCreate = true"
    @row-click="handleRowClick"
  >
    <template #cell-builder_tier="{ value }">
      <span :class="['badge', tierBadge(value)]">{{ value }}</span>
    </template>
    <template #cell-status="{ value }">
      <span class="inline-flex items-center gap-1">
        <span :class="[
          'w-2 h-2 rounded-full',
          value === 'active' ? 'bg-green-400' :
          value === 'draft' ? 'bg-gray-300' :
          value === 'paused' ? 'bg-yellow-400' : 'bg-red-400'
        ]" />
        {{ value }}
      </span>
    </template>
  </EntityTable>

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
</template>
