<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSkillsStore } from '../stores'
import SkillCreateModal from '../components/SkillCreateModal.vue'

const router = useRouter()
const store = useSkillsStore()

// ----- State -----
const showCreate = ref(false)
const editSkill = ref(null)
const searchQuery = ref('')
const activeCategory = ref('all')

onMounted(() => store.fetchAll())

// ----- Computed -----
const categories = [
  { value: 'all',       label: 'All',       icon: '📋' },
  { value: 'summarize', label: 'Summarize', icon: '📝' },
  { value: 'classify',  label: 'Classify',  icon: '🏷️' },
  { value: 'extract',   label: 'Extract',   icon: '🔍' },
  { value: 'generate',  label: 'Generate',  icon: '✨' },
  { value: 'transform', label: 'Transform', icon: '🔄' },
  { value: 'custom',    label: 'Custom',    icon: '⚙️' },
]

const filteredSkills = computed(() => {
  let result = store.items
  if (activeCategory.value !== 'all') {
    result = result.filter((s) => s.category === activeCategory.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(
      (s) => s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)
    )
  }
  return result
})

const categoryCount = (cat) => {
  if (cat === 'all') return store.items.length
  return store.items.filter((s) => s.category === cat).length
}

const visibilityIcon = (v) => ({
  private: '🔒', workspace: '👥', org: '🏢', public: '🌐',
}[v] || '👥')

// ----- Actions -----
async function handleCreate(data) {
  try {
    // TODO: Replace with real workspace_id from auth context
    const firstWorkspace = store.items[0]?.workspace_id
    const skill = await store.create({ ...data, workspace_id: firstWorkspace })
    showCreate.value = false
    // Navigate to detail page to set up prompt
    router.push(`/skills/${skill.skill_id}`)
  } catch (err) {
    console.error('Create failed:', err)
  }
}

async function handleEdit(data) {
  try {
    await store.update(editSkill.value.skill_id, data)
    editSkill.value = null
  } catch (err) {
    console.error('Update failed:', err)
  }
}

async function handleDuplicate(skill) {
  try {
    const clone = await store.duplicate(skill.skill_id)
    router.push(`/skills/${clone.skill_id}`)
  } catch (err) {
    console.error('Duplicate failed:', err)
  }
}

function openDetail(skill) {
  router.push(`/skills/${skill.skill_id}`)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header Bar -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <!-- Search -->
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search skills..."
            class="w-64 pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm
                   focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          />
          <span class="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
        </div>
        <span class="text-sm text-gray-400">{{ filteredSkills.length }} skills</span>
      </div>
      <button @click="showCreate = true" class="btn-primary text-sm">
        + New Skill
      </button>
    </div>

    <!-- Category Filter Tabs -->
    <div class="flex gap-2 flex-wrap">
      <button
        v-for="cat in categories"
        :key="cat.value"
        @click="activeCategory = cat.value"
        :class="[
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
          activeCategory === cat.value
            ? 'bg-brand-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        ]"
      >
        <span>{{ cat.icon }}</span>
        <span>{{ cat.label }}</span>
        <span :class="[
          'ml-1 text-xs px-1.5 py-0.5 rounded-full',
          activeCategory === cat.value ? 'bg-white/20' : 'bg-gray-200'
        ]">{{ categoryCount(cat.value) }}</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="text-center py-12 text-gray-400">
      Loading skills...
    </div>

    <!-- Skills Grid -->
    <div v-else-if="filteredSkills.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="skill in filteredSkills"
        :key="skill.skill_id"
        @click="openDetail(skill)"
        class="card hover:shadow-md transition-all cursor-pointer group relative"
      >
        <!-- Top Row -->
        <div class="flex items-start justify-between mb-2">
          <h3 class="font-semibold text-sm text-gray-900 group-hover:text-brand-600 transition-colors">
            {{ skill.name }}
          </h3>
          <!-- Context menu -->
          <div class="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <button
              @click.stop="editSkill = skill"
              class="text-xs px-2 py-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              title="Edit"
            >✏️</button>
            <button
              @click.stop="handleDuplicate(skill)"
              class="text-xs px-2 py-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              title="Duplicate"
            >📋</button>
          </div>
        </div>

        <!-- Description -->
        <p class="text-sm text-gray-500 mb-4 line-clamp-2">
          {{ skill.description || 'No description' }}
        </p>

        <!-- Bottom Row -->
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-2">
            <span class="badge bg-blue-100 text-blue-700">{{ skill.category }}</span>
            <span class="text-gray-400" :title="skill.visibility">
              {{ visibilityIcon(skill.visibility) }}
            </span>
          </div>
          <div class="flex items-center gap-3 text-gray-400">
            <span v-if="skill.usage_count > 0" title="Total uses">
              ▶ {{ skill.usage_count }}
            </span>
            <span v-if="skill.avg_rating > 0" title="Rating">
              ⭐ {{ skill.avg_rating }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card text-center py-16">
      <p class="text-4xl mb-3">⚡</p>
      <p class="text-lg font-medium text-gray-700 mb-1">
        {{ searchQuery || activeCategory !== 'all' ? 'No matching skills' : 'No skills yet' }}
      </p>
      <p class="text-sm text-gray-400 mb-4">
        {{ searchQuery || activeCategory !== 'all'
          ? 'Try adjusting your filters'
          : 'Skills are reusable AI capabilities that power your agents'
        }}
      </p>
      <button @click="showCreate = true" class="btn-primary text-sm">
        Create Your First Skill
      </button>
    </div>

    <!-- Create Modal -->
    <SkillCreateModal
      :show="showCreate"
      @close="showCreate = false"
      @save="handleCreate"
    />

    <!-- Edit Modal -->
    <SkillCreateModal
      :show="!!editSkill"
      :skill="editSkill"
      @close="editSkill = null"
      @save="handleEdit"
    />
  </div>
</template>
