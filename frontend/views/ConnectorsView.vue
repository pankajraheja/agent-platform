<script setup>
import { onMounted } from 'vue'
import EntityTable from '../components/EntityTable.vue'
import { useConnectorsStore } from '../stores'

const store = useConnectorsStore()
onMounted(() => store.fetchAll())

const columns = [
  { key: 'name', label: 'Connector' },
  { key: 'provider', label: 'Provider' },
  { key: 'category', label: 'Category' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status' },
]
</script>

<template>
  <EntityTable
    :columns="columns"
    :items="store.items"
    :loading="store.loading"
    create-label="Add Connector"
    empty-message="No connectors configured yet."
    @create="/* TODO */"
  >
    <template #cell-category="{ value }">
      <span class="badge bg-purple-100 text-purple-700">{{ value }}</span>
    </template>
  </EntityTable>
</template>
