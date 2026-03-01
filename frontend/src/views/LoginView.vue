<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'

const auth = useAuthStore()
const router = useRouter()
const { showToast } = useToast()

const email = ref('')
const errorMsg = ref('')
const submitting = ref(false)

async function handleLogin() {
  errorMsg.value = ''
  submitting.value = true
  try {
    await auth.login(email.value)
    showToast(`Welcome, ${auth.user?.display_name || 'User'}!`, 'success')
    router.push('/')
  } catch (err) {
    errorMsg.value = err.message || 'Login failed'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="card w-full max-w-md">
      <div class="text-center mb-8">
        <span class="text-4xl">🧠</span>
        <h1 class="text-2xl font-bold text-gray-800 mt-3">Agent Platform</h1>
        <p class="text-sm text-gray-500 mt-1">Sign in to your account</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            placeholder="demo@acme.com"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                   focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            id="password"
            type="password"
            placeholder="(not required for prototype)"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                   focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>

        <div v-if="errorMsg" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {{ errorMsg }}
        </div>

        <button
          type="submit"
          :disabled="submitting || !email"
          class="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ submitting ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <p class="text-xs text-gray-400 text-center mt-6">
        Prototype auth — password not enforced
      </p>
    </div>
  </div>
</template>
