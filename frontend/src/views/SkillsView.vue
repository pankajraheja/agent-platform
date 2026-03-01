<script setup>
import { onMounted } from 'vue'
import EntityTable from '../components/EntityTable.vue'
import { useSkillsStore } from '../stores'

const store = useSkillsStore()
onMounted(() => store.fetchAll())

const columns = [
  { key: 'name', label: 'Skill Name' },
  { key: 'category', label: 'Category' },
  { key: 'visibility', label: 'Visibility' },
  { key: 'usage_count', label: 'Uses' },
  { key: 'avg_rating', label: 'Rating' },
]
</script>

<template>
  <EntityTable
    :columns="columns"
    :items="store.items"
    :loading="store.loading"
    create-label="New Skill"
    empty-message="No skills yet. Start building reusable AI capabilities!"
    empty-icon="⚡"
    @create="() => {}"
  >
    <template #cell-category="{ value }">
      <span class="badge bg-blue-100 text-blue-700">{{ value }}</span>
    </template>
    <template #cell-avg_rating="{ value }">
      {{ value > 0 ? `⭐ ${value}` : '—' }}
    </template>
  </EntityTable>
</template>
