<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const sidebarOpen = ref(true)

const navItems = [
  { name: 'Dashboard',  path: '/',           icon: '📊' },
  { name: 'Agents',     path: '/agents',     icon: '🤖' },
  { name: 'Skills',     path: '/skills',     icon: '⚡' },
  { name: 'Connectors', path: '/connectors', icon: '🔌' },
  { name: 'Templates',  path: '/templates',  icon: '📋' },
  { name: 'Personas',   path: '/personas',   icon: '👤' },
  { name: 'Runs',       path: '/runs',       icon: '▶️' },
]
</script>

<template>
  <div class="flex h-screen overflow-hidden">
    <!-- Sidebar -->
    <aside
      :class="sidebarOpen ? 'w-64' : 'w-16'"
      class="bg-brand-900 text-white flex flex-col transition-all duration-200"
    >
      <!-- Logo -->
      <div class="flex items-center gap-3 px-4 py-5 border-b border-brand-700">
        <span class="text-2xl">🧠</span>
        <span v-if="sidebarOpen" class="font-bold text-lg">Agent Platform</span>
      </div>

      <!-- Nav -->
      <nav class="flex-1 py-4 space-y-1 px-2">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                 text-gray-300 hover:text-white hover:bg-brand-700 transition-colors"
          active-class="!bg-brand-600 !text-white"
        >
          <span class="text-lg">{{ item.icon }}</span>
          <span v-if="sidebarOpen">{{ item.name }}</span>
        </router-link>
      </nav>

      <!-- Collapse toggle -->
      <button
        @click="sidebarOpen = !sidebarOpen"
        class="px-4 py-3 text-gray-400 hover:text-white text-sm border-t border-brand-700"
      >
        {{ sidebarOpen ? '← Collapse' : '→' }}
      </button>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto">
      <!-- Top bar -->
      <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 class="text-xl font-semibold text-gray-800">
          {{ $route.meta.title || 'Agent Platform' }}
        </h1>
        <div class="flex items-center gap-3">
          <span class="badge badge-nocode">No-Code</span>
          <div class="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
            D
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <div class="p-6">
        <router-view />
      </div>
    </main>
  </div>
</template>
