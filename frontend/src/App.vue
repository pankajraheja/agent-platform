<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import ToastContainer from './components/ToastContainer.vue'
import { useToast } from './composables/useToast'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const sidebarOpen = ref(true)
const { showToast } = useToast()

const navItems = [
  { name: 'Dashboard',  path: '/',           icon: '📊', exact: true },
  { name: 'Agents',     path: '/agents',     icon: '🤖' },
  { name: 'Skills',     path: '/skills',     icon: '⚡' },
  { name: 'Connectors', path: '/connectors', icon: '🔌' },
  { name: 'Templates',  path: '/templates',  icon: '📋' },
  { name: 'Personas',   path: '/personas',   icon: '👤' },
  { name: 'Runs',       path: '/runs',       icon: '📜' },
]

function isActive(item) {
  if (item.exact) return route.path === item.path
  return route.path.startsWith(item.path)
}

function handleSignOut() {
  auth.logout()
  showToast('Signed out successfully', 'info')
  router.push('/login')
}
</script>

<template>
  <!-- Global toast container -->
  <ToastContainer />

  <!-- Login page: no sidebar/shell -->
  <router-view v-if="route.name === 'Login'" />

  <!-- Authenticated shell -->
  <div v-else class="flex h-screen overflow-hidden">
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
          :class="[
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isActive(item)
              ? 'bg-brand-600 text-white'
              : 'text-gray-300 hover:text-white hover:bg-brand-700'
          ]"
        >
          <span class="text-lg">{{ item.icon }}</span>
          <span v-if="sidebarOpen">{{ item.name }}</span>
        </router-link>
      </nav>

      <!-- User info + Sign Out -->
      <div class="border-t border-brand-700 px-3 py-3">
        <div v-if="auth.user" class="flex items-center gap-2 mb-3">
          <span class="text-lg">{{ auth.persona?.icon || '👤' }}</span>
          <div v-if="sidebarOpen" class="min-w-0">
            <p class="text-sm font-medium text-white truncate">{{ auth.user.display_name }}</p>
            <div class="flex items-center gap-2 mt-0.5">
              <p class="text-xs text-gray-400 truncate">{{ auth.persona?.name || auth.user.role }}</p>
              <span :class="['text-[10px] px-1.5 py-0.5 rounded-full font-medium', {
                'bg-green-500/20 text-green-300': auth.user?.preferred_tier === 'no-code',
                'bg-blue-500/20 text-blue-300': auth.user?.preferred_tier === 'low-code',
                'bg-purple-500/20 text-purple-300': auth.user?.preferred_tier === 'pro-code',
              }]">{{ auth.user?.preferred_tier }}</span>
            </div>
          </div>
        </div>
        <button
          @click="handleSignOut"
          class="w-full text-left px-2 py-1.5 text-xs text-gray-400 hover:text-white transition-colors rounded"
        >
          {{ sidebarOpen ? 'Sign Out' : '🚪' }}
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto">
      <!-- Top bar -->
      <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 class="text-xl font-semibold text-gray-800">
          {{ $route.meta.title || 'Agent Platform' }}
        </h1>
        <div class="flex items-center gap-3">
          <span :class="['badge', {
            'badge-nocode': auth.user?.preferred_tier === 'no-code',
            'badge-lowcode': auth.user?.preferred_tier === 'low-code',
            'badge-procode': auth.user?.preferred_tier === 'pro-code',
          }]">{{ auth.user?.preferred_tier || 'no-code' }}</span>
          <div class="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {{ auth.user?.display_name?.charAt(0) || 'U' }}
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
