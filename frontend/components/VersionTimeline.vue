<script setup>
import { computed } from 'vue'

const props = defineProps({
  versions: { type: Array, default: () => [] },
  selectedId: { type: String, default: null },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['select', 'create'])

const statusConfig = {
  published:  { color: 'bg-green-400',  label: 'Published' },
  draft:      { color: 'bg-yellow-400', label: 'Draft' },
  deprecated: { color: 'bg-gray-300',   label: 'Deprecated' },
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-gray-700">Versions</h3>
      <button
        @click="$emit('create')"
        :disabled="saving"
        class="text-xs text-brand-600 hover:text-brand-700 font-medium"
      >
        + New Version
      </button>
    </div>

    <div v-if="versions.length === 0" class="text-center py-6 text-gray-400 text-sm">
      No versions yet
    </div>

    <div v-else class="space-y-1">
      <button
        v-for="v in versions"
        :key="v.skill_version_id"
        @click="$emit('select', v)"
        :class="[
          'w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all',
          v.skill_version_id === selectedId
            ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-200'
            : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
        ]"
      >
        <div class="flex items-center justify-between">
          <span class="font-mono font-medium text-gray-800">v{{ v.version_number }}</span>
          <span class="flex items-center gap-1.5">
            <span :class="['w-2 h-2 rounded-full', statusConfig[v.status]?.color || 'bg-gray-300']" />
            <span class="text-xs text-gray-500">{{ statusConfig[v.status]?.label || v.status }}</span>
          </span>
        </div>
        <p class="text-xs text-gray-400 mt-1">
          {{ new Date(v.created_at).toLocaleDateString() }}
          <span v-if="v.prompt_config?.model"> · {{ v.model_settings?.model || '' }}</span>
        </p>
      </button>
    </div>
  </div>
</template>
