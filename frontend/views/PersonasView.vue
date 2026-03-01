<script setup>
import { onMounted } from 'vue'
import { usePersonasStore } from '../stores'

const store = usePersonasStore()
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
      <p class="text-sm text-gray-500">{{ store.items.length }} personas defined</p>
      <button class="btn-primary text-sm">+ New Persona</button>
    </div>

    <div v-if="store.items.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <div
        v-for="p in store.items"
        :key="p.persona_id"
        class="card hover:shadow-md transition-shadow cursor-pointer text-center"
      >
        <div class="text-4xl mb-3">{{ p.icon || '👤' }}</div>
        <h3 class="font-semibold text-sm mb-1">{{ p.name }}</h3>
        <p class="text-xs text-gray-400 mb-3">{{ p.department }}</p>
        <span :class="['badge', tierBadge(p.default_tier)]">{{ p.default_tier }}</span>
        <p class="text-xs text-gray-500 mt-3 line-clamp-2">{{ p.description }}</p>
      </div>
    </div>

    <div v-else class="card text-center py-12 text-gray-400">
      No personas defined yet. Create personas to personalize the platform experience.
    </div>
  </div>
</template>
