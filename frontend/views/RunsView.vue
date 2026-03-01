<script setup>
import { onMounted } from 'vue'
import EntityTable from '../components/EntityTable.vue'
import { useRunsStore } from '../stores'

const store = useRunsStore()
onMounted(() => store.fetchAll())

const columns = [
  { key: 'run_id', label: 'Run ID', format: (v) => v?.substring(0, 8) + '...' },
  { key: 'trigger_type', label: 'Trigger' },
  { key: 'status', label: 'Status' },
  { key: 'total_tokens', label: 'Tokens' },
  { key: 'duration_ms', label: 'Duration', format: (v) => v ? `${(v / 1000).toFixed(1)}s` : '—' },
  { key: 'started_at', label: 'Started', format: (v) => v ? new Date(v).toLocaleString() : '—' },
]

const statusColor = (status) => ({
  running: 'bg-blue-400',
  completed: 'bg-green-400',
  failed: 'bg-red-400',
  awaiting_human: 'bg-yellow-400',
}[status] || 'bg-gray-300')
</script>

<template>
  <EntityTable
    :columns="columns"
    :items="store.items"
    :loading="store.loading"
    create-label="Trigger Run"
    empty-message="No agent runs yet. Trigger your first agent to see execution history."
    @create="/* TODO */"
    @row-click="/* TODO: show run detail with steps */"
  >
    <template #cell-status="{ value }">
      <span class="inline-flex items-center gap-1.5">
        <span :class="['w-2 h-2 rounded-full', statusColor(value)]" />
        {{ value }}
      </span>
    </template>
    <template #cell-total_tokens="{ value }">
      {{ value ? value.toLocaleString() : '—' }}
    </template>
  </EntityTable>
</template>
