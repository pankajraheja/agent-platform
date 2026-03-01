<script setup>
import { useToast } from '../composables/useToast'

const { toasts, removeToast } = useToast()

const typeStyles = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
}

const typeIcons = {
  success: '\u2713',
  error: '\u2717',
  info: '\u2139',
}
</script>

<template>
  <div class="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
    <TransitionGroup
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-x-8"
      enter-to-class="opacity-100 translate-x-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-x-0"
      leave-to-class="opacity-0 translate-x-8"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg max-w-sm', typeStyles[toast.type] || typeStyles.info]"
      >
        <span class="font-bold text-sm">{{ typeIcons[toast.type] || typeIcons.info }}</span>
        <p class="text-sm flex-1">{{ toast.message }}</p>
        <button class="text-current opacity-50 hover:opacity-100" @click="removeToast(toast.id)">&times;</button>
      </div>
    </TransitionGroup>
  </div>
</template>
