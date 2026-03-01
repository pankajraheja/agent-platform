<script setup>
defineProps({
  lines: { type: Number, default: 3 },
  type: { type: String, default: 'list' }, // 'list', 'card', 'table'
})
</script>

<template>
  <!-- Table skeleton -->
  <div v-if="type === 'table'" class="animate-pulse">
    <div class="h-10 bg-gray-100 rounded mb-3" />
    <div v-for="i in lines" :key="i" class="flex gap-4 mb-3">
      <div class="h-5 bg-gray-100 rounded flex-1" />
      <div class="h-5 bg-gray-100 rounded w-24" />
      <div class="h-5 bg-gray-100 rounded w-20" />
      <div class="h-5 bg-gray-100 rounded w-16" />
    </div>
  </div>

  <!-- Card grid skeleton -->
  <div v-else-if="type === 'card'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
    <div v-for="i in lines" :key="i" class="rounded-xl border border-gray-100 p-5 space-y-3">
      <div class="h-4 bg-gray-100 rounded w-3/4" />
      <div class="h-3 bg-gray-100 rounded w-1/2" />
      <div class="flex gap-2">
        <div class="h-5 bg-gray-100 rounded-full w-16" />
        <div class="h-5 bg-gray-100 rounded-full w-14" />
      </div>
      <div class="h-3 bg-gray-100 rounded w-full" />
    </div>
  </div>

  <!-- List skeleton (default) -->
  <div v-else class="animate-pulse space-y-4">
    <div v-for="i in lines" :key="i" class="flex items-center gap-4">
      <div class="w-10 h-10 bg-gray-100 rounded-full flex-shrink-0" />
      <div class="flex-1 space-y-2">
        <div class="h-4 bg-gray-100 rounded w-3/4" />
        <div class="h-3 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
  </div>
</template>
