<script setup>
/**
 * EntityTable — Reusable list table component
 *
 * Props:
 *   columns: [{ key, label, format? }]
 *   items: array of row objects
 *   loading: boolean
 *   emptyMessage: string
 *   emptyIcon: string (emoji)
 *
 * Emits:
 *   row-click(item)
 *   create
 */
import SkeletonLoader from './SkeletonLoader.vue'

defineProps({
  columns: { type: Array, required: true },
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  emptyMessage: { type: String, default: 'No items found' },
  emptyIcon: { type: String, default: '📭' },
  createLabel: { type: String, default: 'Create New' },
})

defineEmits(['row-click', 'create'])
</script>

<template>
  <div class="card p-0 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
      <slot name="header">
        <p class="text-sm text-gray-500">{{ items.length }} items</p>
      </slot>
      <button @click="$emit('create')" class="btn-primary text-sm">
        + {{ createLabel }}
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="px-6 py-6">
      <SkeletonLoader type="table" :lines="5" />
    </div>

    <!-- Table -->
    <table v-else-if="items.length" class="w-full">
      <thead>
        <tr class="bg-gray-50 text-left">
          <th
            v-for="col in columns"
            :key="col.key"
            class="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        <tr
          v-for="(item, idx) in items"
          :key="idx"
          @click="$emit('row-click', item)"
          class="hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <td v-for="col in columns" :key="col.key" class="px-6 py-4 text-sm">
            <slot :name="`cell-${col.key}`" :item="item" :value="item[col.key]">
              {{ col.format ? col.format(item[col.key], item) : item[col.key] ?? '—' }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Empty state -->
    <div v-else class="px-6 py-16 text-center">
      <p class="text-4xl mb-3">{{ emptyIcon }}</p>
      <p class="text-gray-500 font-medium">{{ emptyMessage }}</p>
      <button class="btn-primary text-sm mt-4" @click="$emit('create')">+ {{ createLabel }}</button>
    </div>
  </div>
</template>
