<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  version: { type: Object, default: null },
  testing: { type: Boolean, default: false },
  testResult: { type: Object, default: null },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['save-version', 'run-test', 'publish'])

const models = [
  { value: 'gpt-4o',       label: 'GPT-4o',       provider: 'OpenAI' },
  { value: 'gpt-4o-mini',  label: 'GPT-4o Mini',  provider: 'OpenAI' },
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet', provider: 'Anthropic' },
  { value: 'claude-haiku', label: 'Claude Haiku',  provider: 'Anthropic' },
]

// ----- Prompt Config -----
const systemPrompt = ref('')
const userTemplate = ref('')
const temperature = ref(0.7)
const maxTokens = ref(1024)
const selectedModel = ref('gpt-4o-mini')

// ----- Test Input -----
const testInput = ref('')
const testHistory = ref([])

// Sync from version prop
watch(() => props.version, (v) => {
  if (v) {
    const pc = v.prompt_config || {}
    const ms = v.model_settings || {}
    systemPrompt.value = pc.system_prompt || ''
    userTemplate.value = pc.user_template || ''
    temperature.value = ms.temperature ?? 0.7
    maxTokens.value = ms.max_tokens ?? 1024
    selectedModel.value = ms.model || 'gpt-4o-mini'
    testHistory.value = Array.isArray(v.test_results) ? v.test_results : []
  }
}, { immediate: true })

// Track unsaved changes
const hasChanges = computed(() => {
  if (!props.version) return false
  const pc = props.version.prompt_config || {}
  const ms = props.version.model_settings || {}
  return (
    systemPrompt.value !== (pc.system_prompt || '') ||
    userTemplate.value !== (pc.user_template || '') ||
    temperature.value !== (ms.temperature ?? 0.7) ||
    maxTokens.value !== (ms.max_tokens ?? 1024) ||
    selectedModel.value !== (ms.model || 'gpt-4o-mini')
  )
})

function handleSave() {
  emit('save-version', {
    prompt_config: JSON.stringify({
      system_prompt: systemPrompt.value,
      user_template: userTemplate.value,
    }),
    model_settings: JSON.stringify({
      model: selectedModel.value,
      temperature: temperature.value,
      max_tokens: maxTokens.value,
    }),
  })
}

function handleTest() {
  let input
  try {
    input = JSON.parse(testInput.value)
  } catch {
    input = { text: testInput.value }
  }
  emit('run-test', input)
}
</script>

<template>
  <div class="space-y-6">
    <!-- No version state -->
    <div v-if="!version" class="text-center py-12 text-gray-400">
      <p class="text-lg mb-2">No version selected</p>
      <p class="text-sm">Create a version to start configuring your skill's prompt</p>
    </div>

    <template v-else>
      <!-- Version header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm font-mono text-gray-500">v{{ version.version_number }}</span>
          <span :class="[
            'badge',
            version.status === 'published' ? 'bg-green-100 text-green-700' :
            version.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-500'
          ]">
            {{ version.status }}
          </span>
          <span v-if="hasChanges" class="badge bg-orange-100 text-orange-600">unsaved</span>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="version.status === 'draft'"
            @click="$emit('publish')"
            :disabled="saving || hasChanges"
            class="text-xs px-3 py-1.5 rounded-lg border border-green-300 text-green-700
                   hover:bg-green-50 disabled:opacity-50 transition-colors"
          >
            Publish
          </button>
          <button
            @click="handleSave"
            :disabled="!hasChanges || saving"
            :class="[
              'btn-primary text-sm',
              (!hasChanges || saving) && 'opacity-50 cursor-not-allowed'
            ]"
          >
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>

      <!-- Two-column layout: Config + Test -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <!-- LEFT: Prompt Configuration -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-gray-700">Prompt Configuration</h3>

          <!-- System Prompt -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">System Prompt</label>
            <textarea
              v-model="systemPrompt"
              rows="6"
              placeholder="You are a helpful assistant that..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono
                     focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-y"
            />
          </div>

          <!-- User Template -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">
              User Message Template
              <span class="text-gray-400 font-normal ml-1">Use {{ '{' }}{{ '{' }}input{{ '}' }}{{ '}' }} for dynamic content</span>
            </label>
            <textarea
              v-model="userTemplate"
              rows="4"
              placeholder="Summarize the following text:\n\n{{input}}"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono
                     focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-y"
            />
          </div>

          <!-- Model Settings -->
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Model</label>
              <select
                v-model="selectedModel"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                       focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option v-for="m in models" :key="m.value" :value="m.value">
                  {{ m.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">
                Temperature: {{ temperature }}
              </label>
              <input
                v-model.number="temperature"
                type="range"
                min="0"
                max="2"
                step="0.1"
                class="w-full mt-2"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Max Tokens</label>
              <input
                v-model.number="maxTokens"
                type="number"
                min="1"
                max="16384"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                       focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>
        </div>

        <!-- RIGHT: Test Panel -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-gray-700">Test Skill</h3>

          <!-- Test Input -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Test Input</label>
            <textarea
              v-model="testInput"
              rows="5"
              placeholder="Paste sample text or JSON input here..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono
                     focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-y"
            />
          </div>

          <button
            @click="handleTest"
            :disabled="!testInput.trim() || testing"
            :class="[
              'w-full py-2.5 rounded-lg font-medium text-sm transition-colors',
              testInput.trim() && !testing
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            ]"
          >
            {{ testing ? '⏳ Running...' : '▶ Run Test' }}
          </button>

          <!-- Test Result -->
          <div v-if="testResult" class="rounded-lg border border-gray-200 overflow-hidden">
            <div class="bg-gray-50 px-4 py-2 flex items-center justify-between text-xs text-gray-500">
              <span>{{ testResult.model }}</span>
              <div class="flex items-center gap-3">
                <span>{{ testResult.tokens_used }} tokens</span>
                <span>{{ testResult.latency_ms }}ms</span>
              </div>
            </div>
            <pre class="px-4 py-3 text-sm text-gray-800 whitespace-pre-wrap bg-white max-h-64 overflow-y-auto">{{ testResult.result }}</pre>
          </div>

          <!-- Test History -->
          <div v-if="testHistory.length > 0">
            <h4 class="text-xs font-medium text-gray-500 mb-2">Recent Tests</h4>
            <div class="space-y-2 max-h-48 overflow-y-auto">
              <div
                v-for="(entry, i) in testHistory.slice(0, 5)"
                :key="i"
                class="text-xs p-2 rounded-lg border border-gray-100 bg-gray-50"
              >
                <div class="flex justify-between text-gray-400 mb-1">
                  <span>{{ new Date(entry.timestamp).toLocaleString() }}</span>
                  <span>{{ entry.tokens }} tok · {{ entry.latency_ms }}ms</span>
                </div>
                <p class="text-gray-600 truncate">{{ entry.output }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
