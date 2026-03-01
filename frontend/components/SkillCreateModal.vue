<script setup>
import { ref, watch, computed } from 'vue'
import BaseModal from './BaseModal.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  skill: { type: Object, default: null }, // null = create, object = edit
})
const emit = defineEmits(['close', 'save'])

const isEdit = computed(() => !!props.skill)

const categories = [
  { value: 'summarize',  label: 'Summarize',  icon: '📝' },
  { value: 'classify',   label: 'Classify',   icon: '🏷️' },
  { value: 'extract',    label: 'Extract',    icon: '🔍' },
  { value: 'generate',   label: 'Generate',   icon: '✨' },
  { value: 'transform',  label: 'Transform',  icon: '🔄' },
  { value: 'custom',     label: 'Custom',     icon: '⚙️' },
]

const visibilityOptions = [
  { value: 'private',   label: 'Private',   desc: 'Only you' },
  { value: 'workspace', label: 'Workspace', desc: 'Your team' },
  { value: 'org',       label: 'Organization', desc: 'Everyone in org' },
  { value: 'public',    label: 'Marketplace',  desc: 'All platform users' },
]

// Form data
const form = ref({
  name: '',
  description: '',
  category: 'generate',
  visibility: 'workspace',
  input_schema: {},
  output_schema: {},
})

// Reset form when modal opens or skill changes
watch(() => [props.show, props.skill], () => {
  if (props.show && props.skill) {
    form.value = {
      name: props.skill.name || '',
      description: props.skill.description || '',
      category: props.skill.category || 'generate',
      visibility: props.skill.visibility || 'workspace',
      input_schema: props.skill.input_schema || {},
      output_schema: props.skill.output_schema || {},
    }
  } else if (props.show) {
    form.value = {
      name: '',
      description: '',
      category: 'generate',
      visibility: 'workspace',
      input_schema: {},
      output_schema: {},
    }
  }
}, { immediate: true })

const isValid = computed(() => form.value.name.trim().length > 0)

function handleSave() {
  if (!isValid.value) return
  emit('save', { ...form.value })
}
</script>

<template>
  <BaseModal :show="show" :title="isEdit ? 'Edit Skill' : 'Create New Skill'" size="lg" @close="$emit('close')">
    <div class="space-y-5">
      <!-- Name -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Skill Name</label>
        <input
          v-model="form.name"
          type="text"
          placeholder="e.g. Email Drafter, Invoice Extractor..."
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
        />
      </div>

      <!-- Description -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          v-model="form.description"
          rows="3"
          placeholder="What does this skill do? When should it be used?"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none"
        />
      </div>

      <!-- Category -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="cat in categories"
            :key="cat.value"
            @click="form.category = cat.value"
            :class="[
              'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-all',
              form.category === cat.value
                ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500'
                : 'border-gray-200 hover:border-gray-300 text-gray-600'
            ]"
          >
            <span>{{ cat.icon }}</span>
            <span class="font-medium">{{ cat.label }}</span>
          </button>
        </div>
      </div>

      <!-- Visibility -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="vis in visibilityOptions"
            :key="vis.value"
            @click="form.visibility = vis.value"
            :class="[
              'px-3 py-2.5 rounded-lg border text-sm text-left transition-all',
              form.visibility === vis.value
                ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500'
                : 'border-gray-200 hover:border-gray-300 text-gray-600'
            ]"
          >
            <p class="font-medium">{{ vis.label }}</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ vis.desc }}</p>
          </button>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <button @click="$emit('close')" class="btn-secondary text-sm">Cancel</button>
        <button
          @click="handleSave"
          :disabled="!isValid"
          :class="[
            'btn-primary text-sm',
            !isValid && 'opacity-50 cursor-not-allowed'
          ]"
        >
          {{ isEdit ? 'Save Changes' : 'Create Skill' }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>
