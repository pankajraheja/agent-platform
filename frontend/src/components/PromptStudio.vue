<script setup>
import { ref } from 'vue'
import api from '../api/client'

const props = defineProps({
  skillId: { type: String, required: true },
  version: { type: Object, default: null },
})

const testInput = ref('')
const testResult = ref(null)
const running = ref(false)
const error = ref('')

async function runTest() {
  error.value = ''
  testResult.value = null
  running.value = true

  let parsedInput = testInput.value.trim()
  // Try to parse as JSON, otherwise send as raw string
  try {
    parsedInput = JSON.parse(parsedInput)
  } catch {
    // keep as string
  }

  try {
    const res = await api.post(`/skills/${props.skillId}/test`, {
      input: parsedInput,
      version_id: props.version?.skill_version_id || null,
    })
    testResult.value = res.data
  } catch (err) {
    error.value = err.message || 'Test execution failed'
  } finally {
    running.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Prompt Config Display -->
    <div v-if="version?.prompt_config" class="space-y-3">
      <div>
        <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">System Prompt</label>
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">{{ version.prompt_config.system_prompt || '—' }}</div>
      </div>
      <div>
        <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">User Template</label>
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">{{ version.prompt_config.user_template || '—' }}</div>
      </div>
    </div>
    <div v-else class="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-400 text-center">
      No prompt configuration for this version.
    </div>

    <!-- Model Settings -->
    <div v-if="version?.model_settings" class="flex items-center gap-4 text-xs text-gray-500">
      <span class="bg-gray-100 px-2 py-1 rounded font-mono">{{ version.model_settings.model || 'default' }}</span>
      <span>temp: {{ version.model_settings.temperature ?? '—' }}</span>
      <span>max tokens: {{ version.model_settings.max_tokens ?? '—' }}</span>
    </div>

    <!-- Divider -->
    <div class="border-t border-gray-200" />

    <!-- Test Input -->
    <div>
      <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Test Input</label>
      <textarea
        v-model="testInput"
        rows="4"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
        :placeholder='`Try: {\"customer_name\": \"Sarah Chen\", \"inquiry\": \"What is the pricing for your Enterprise plan?\", \"tone\": \"professional\"}`'
      />
    </div>

    <!-- Run Button -->
    <button
      class="btn-primary text-sm flex items-center gap-2"
      :disabled="running || !testInput.trim()"
      @click="runTest"
    >
      <svg v-if="running" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span v-else>&#9654;</span>
      {{ running ? 'Running...' : 'Run Test' }}
    </button>

    <!-- Error -->
    <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
      {{ error }}
    </div>

    <!-- Test Results -->
    <div v-if="testResult" class="space-y-2">
      <div class="flex items-center justify-between">
        <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Output</label>
        <div class="flex items-center gap-3 text-xs text-gray-400">
          <span>{{ testResult.tokens_used }} tokens</span>
          <span>{{ testResult.latency_ms }}ms</span>
          <span class="bg-gray-100 px-2 py-0.5 rounded font-mono">{{ testResult.model }}</span>
        </div>
      </div>
      <pre class="bg-gray-900 text-green-300 rounded-lg p-4 text-sm whitespace-pre-wrap overflow-x-auto leading-relaxed max-h-[500px] overflow-y-auto">{{ testResult.result }}</pre>
    </div>
  </div>
</template>
