<script setup>
import { onMounted } from 'vue'
import EntityTable from '../components/EntityTable.vue'
import { useAgentsStore } from '../stores'

const store = useAgentsStore()
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
</script>

<template>
  <EntityTable
    :columns="columns"
    :items="store.items"
    :loading="store.loading"
    create-label="New Agent"
    empty-message="No agents yet. Create your first one!"
    @create="/* TODO: open create modal */"
    @row-click="/* TODO: navigate to agent detail */"
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
</template>
