<script setup>
import { onMounted } from 'vue'
import { useTemplatesStore } from '../stores'

const store = useTemplatesStore()
onMounted(() => store.fetchAll())

const tierBadge = (tier) => ({
  'no-code': 'badge-nocode',
  'low-code': 'badge-lowcode',
  'pro-code': 'badge-procode',
}[tier] || '')
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <p class="text-sm text-gray-500">{{ store.items.length }} templates available</p>
      <button class="btn-primary text-sm">+ Create Template</button>
    </div>

    <!-- Card Grid -->
    <div v-if="store.items.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="t in store.items"
        :key="t.template_id"
        class="card hover:shadow-md transition-shadow cursor-pointer"
      >
        <div class="flex items-start justify-between mb-3">
          <h3 class="font-semibold text-sm">{{ t.name }}</h3>
          <span :class="['badge', tierBadge(t.builder_tier)]">{{ t.builder_tier }}</span>
        </div>
        <p class="text-sm text-gray-500 mb-4 line-clamp-2">{{ t.description }}</p>
        <div class="flex items-center justify-between text-xs text-gray-400">
          <span class="badge bg-gray-100 text-gray-600">{{ t.category }}</span>
          <span>{{ t.fork_count || 0 }} forks</span>
        </div>
      </div>
    </div>

    <div v-else class="card text-center py-12 text-gray-400">
      No templates yet. Create one to help your team get started faster.
    </div>
  </div>
</template>
