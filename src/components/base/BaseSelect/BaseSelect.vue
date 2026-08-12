<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import type { SelectOption } from '@/types'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useClickOutside } from '@/composables/useClickOutside'
import { useFloatingPanel } from '@/composables/useFloatingPanel'
import BaseSelectPanel from './BaseSelectPanel.vue'
import BaseSelectTrigger from './BaseSelectTrigger.vue'

type SelectValue = string | number | null
type ModelValue = SelectValue | SelectValue[]

interface Props {
  modelValue: ModelValue
  options: SelectOption[]
  label?: string
  placeholder?: string
  searchable?: boolean
  clearable?: boolean
  multiple?: boolean
  disabled?: boolean
  error?: string
  hint?: string
  icon?: string
  required?: boolean
  size?: 'sm' | 'md' | 'lg'
  emptyText?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  placeholder: 'Selecciona una opción',
  searchable: false,
  clearable: false,
  multiple: false,
  disabled: false,
  error: '',
  hint: '',
  icon: '',
  required: false,
  size: 'md',
  emptyText: 'Sin resultados',
})

const emit = defineEmits<{
  'update:modelValue': [value: ModelValue]
  change: [value: ModelValue]
  open: []
  close: []
}>()

const uid = useId()
const triggerCmp = ref<{ el: HTMLElement | null; focus: () => void } | null>(null)
const triggerRef = computed(() => triggerCmp.value?.el ?? null)
const panelRef = ref<{ el: HTMLElement | null } | null>(null)
const panelEl = () => panelRef.value?.el ?? null
const open = ref(false)
const search = ref('')
const activeIndex = ref(-1)

const { isMobile } = useBreakpoint()
const { position, update, start, stop } = useFloatingPanel(triggerRef, { estimatedHeight: 320 })

const selectedValues = computed<SelectValue[]>(() => {
  if (props.multiple) return Array.isArray(props.modelValue) ? props.modelValue : []
  return props.modelValue === null || props.modelValue === undefined ? [] : [props.modelValue as SelectValue]
})

const selectedOptions = computed(() =>
  props.options.filter((o) => selectedValues.value.includes(o.value)),
)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!props.searchable || !q) return props.options
  return props.options.filter(
    (o) =>
      o.label.toLowerCase().includes(q) || (o.description ?? '').toLowerCase().includes(q),
  )
})

const hasValue = computed(() => selectedOptions.value.length > 0)

/**
 * `undefined` = la opción no lleva avatar. Ojo con normalizar a `null`: eso haría
 * que TODO select pintara un avatar de iniciales, no solo los de cliente.
 */
const triggerImage = computed(() => {
  if (props.multiple) return undefined
  const option = selectedOptions.value[0]
  return option && 'image' in option ? option.image ?? null : undefined
})
const showClear = computed(() => props.clearable && hasValue.value && !props.disabled)

const displayText = computed(() => {
  if (!hasValue.value) return props.placeholder
  if (!props.multiple) return selectedOptions.value[0]?.label ?? props.placeholder
  if (selectedOptions.value.length === 1) return selectedOptions.value[0]?.label ?? props.placeholder
  return `${selectedOptions.value.length} seleccionados`
})

const describedBy = computed(() => {
  if (props.error) return `${uid}-err`
  if (props.hint) return `${uid}-hint`
  return undefined
})

// ── Apertura / cierre ────────────────────────────────────────────
function openPanel() {
  if (props.disabled || open.value) return
  open.value = true
  search.value = ''
  activeIndex.value = filtered.value.findIndex((o) => selectedValues.value.includes(o.value))
  start()
  nextTick(update)
  emit('open')
}

function closePanel() {
  if (!open.value) return
  open.value = false
  activeIndex.value = -1
  stop()
  emit('close')
}

function toggle() {
  open.value ? closePanel() : openPanel()
}

useClickOutside([triggerRef, panelEl], closePanel, { enabled: open })

watch(filtered, () => {
  if (activeIndex.value >= filtered.value.length) activeIndex.value = filtered.value.length - 1
})

// ── Selección ────────────────────────────────────────────────────
function pick(option: SelectOption) {
  if (option.disabled) return
  if (props.multiple) {
    const current = [...selectedValues.value]
    const idx = current.indexOf(option.value)
    if (idx >= 0) current.splice(idx, 1)
    else current.push(option.value)
    emit('update:modelValue', current)
    emit('change', current)
    return
  }
  emit('update:modelValue', option.value)
  emit('change', option.value)
  closePanel()
  triggerRef.value?.focus()
}

function clear() {
  const empty: ModelValue = props.multiple ? [] : null
  emit('update:modelValue', empty)
  emit('change', empty)
}

// ── Teclado ──────────────────────────────────────────────────────
function move(step: number) {
  const list = filtered.value
  if (!list.length) return
  let next = activeIndex.value
  for (let i = 0; i < list.length; i += 1) {
    next = (next + step + list.length) % list.length
    if (!list[next]?.disabled) break
  }
  activeIndex.value = next
  scrollActiveIntoView()
}

function scrollActiveIntoView() {
  nextTick(() => {
    const el = panelEl()?.querySelectorAll('[role="option"]')[activeIndex.value]
    ;(el as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' })
  })
}

function onKeydown(event: KeyboardEvent) {
  if (props.disabled) return
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      open.value ? move(1) : openPanel()
      break
    case 'ArrowUp':
      event.preventDefault()
      open.value ? move(-1) : openPanel()
      break
    case 'Home':
      if (open.value) { event.preventDefault(); activeIndex.value = 0; scrollActiveIntoView() }
      break
    case 'End':
      if (open.value) { event.preventDefault(); activeIndex.value = filtered.value.length - 1; scrollActiveIntoView() }
      break
    case 'Enter': {
      event.preventDefault()
      if (!open.value) { openPanel(); break }
      const current = filtered.value[activeIndex.value]
      if (current) pick(current)
      break
    }
    case ' ':
      if (!open.value) { event.preventDefault(); openPanel() }
      break
    case 'Escape':
      if (open.value) { event.preventDefault(); closePanel() }
      break
    case 'Tab':
      closePanel()
      break
  }
}
</script>

<template>
  <div
    class="sel"
    :class="[
      `sel--${props.size}`,
      { 'sel--open': open, 'sel--error': !!props.error, 'sel--disabled': props.disabled },
    ]"
  >
    <label v-if="props.label" class="sel__label" :for="uid">
      {{ props.label }}
      <span v-if="props.required" class="sel__req" aria-hidden="true">*</span>
    </label>

    <BaseSelectTrigger
      ref="triggerCmp"
      :id="uid"
      :text="displayText"
      :placeholder="!hasValue"
      :icon="props.icon"
      :image="triggerImage"
      :avatar-name="!props.multiple ? selectedOptions[0]?.label ?? '' : ''"
      :dot-color="!props.multiple ? selectedOptions[0]?.color ?? '' : ''"
      :count="props.multiple ? selectedOptions.length : 0"
      :show-clear="showClear"
      :open="open"
      :disabled="props.disabled"
      :error="!!props.error"
      :size="props.size"
      :described-by="describedBy"
      :list-id="`${uid}-list`"
      @toggle="toggle"
      @clear="clear"
      @keydown="onKeydown"
    />

    <Transition name="fade-slide" mode="out-in">
      <p v-if="props.error" :id="`${uid}-err`" class="sel__msg sel__msg--error" role="alert">
        <i class="fa-solid fa-circle-exclamation" aria-hidden="true" />
        {{ props.error }}
      </p>
      <p v-else-if="props.hint" :id="`${uid}-hint`" class="sel__msg">{{ props.hint }}</p>
    </Transition>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="open && isMobile" class="sel__backdrop" @click="closePanel" />
      </Transition>

      <Transition :name="isMobile ? 'sheet' : 'scale-pop'">
        <BaseSelectPanel
          v-if="open"
          ref="panelRef"
          :options="filtered"
          :selected-values="selectedValues"
          :active-index="activeIndex"
          :multiple="props.multiple"
          :searchable="props.searchable"
          :search="search"
          :mobile="isMobile"
          :position="position"
          :list-id="`${uid}-list`"
          :title="props.label || 'Seleccionar'"
          :empty-text="props.emptyText"
          @select="pick"
          @hover="activeIndex = $event"
          @update:search="search = $event"
          @keydown="onKeydown"
          @close="closePanel"
        />
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.sel {
  @include flex-col($sp-2);
  width: 100%;
  min-width: 0;
}

.sel__label {
  @include label-text;
  @include flex(row, flex-start, center, 3px);
  transition: color $transition-base;
}
.sel--open .sel__label { color: $primary; }
.sel--error .sel__label { color: $alert-error; }
.sel__req { color: $primary; }

.sel__msg {
  font-size: $fs-xs;
  color: $text-secondary;
  @include flex(row, flex-start, center, $sp-1);

  &--error { color: $alert-error; font-weight: 600; }
}

.sel__backdrop {
  position: fixed;
  inset: 0;
  z-index: calc(#{$z-dropdown} - 1);
  background: rgba($primary-dark, 0.45);
  backdrop-filter: blur(2px);
}
</style>

<style lang="scss">
// Transición de hoja inferior (global: el panel vive en <body> por Teleport)
.sheet-enter-active,
.sheet-leave-active {
  transition: transform 0.32s $ease-out, opacity $transition-base;
}
.sheet-enter-from,
.sheet-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
