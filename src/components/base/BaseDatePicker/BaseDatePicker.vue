<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useClickOutside } from '@/composables/useClickOutside'
import { useFloatingPanel } from '@/composables/useFloatingPanel'
import { useFormat } from '@/composables/useFormat'
import BaseDatePickerPanel from './BaseDatePickerPanel.vue'

interface Props {
  modelValue: string | null
  label?: string
  min?: string | null
  max?: string | null
  clearable?: boolean
  placeholder?: string
  disabled?: boolean
  error?: string
  hint?: string
  required?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  min: null,
  max: null,
  clearable: true,
  placeholder: 'Selecciona una fecha',
  disabled: false,
  error: '',
  hint: '',
  required: false,
  size: 'md',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  change: [value: string | null]
}>()

const uid = useId()
const { formatDateShort } = useFormat()
const { isMobile } = useBreakpoint()

const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<{ el?: HTMLElement | null } | null>(null)
const panelEl = () => panelRef.value?.el ?? null
const open = ref(false)

const { position, panelRef: floatingEl, update, start, stop } = useFloatingPanel(triggerRef, {
  estimatedHeight: 380,
  matchWidth: false,
  minWidth: 320,
})

/** Normaliza cualquier ISO a "YYYY-MM-DD". */
const selected = computed(() => {
  const v = props.modelValue
  if (!v) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v)
  return m ? m[0] : null
})

const today = new Date()
const viewMonth = ref(today.getMonth())
const viewYear = ref(today.getFullYear())

function syncView() {
  const v = selected.value
  if (!v) return
  viewYear.value = Number(v.slice(0, 4))
  viewMonth.value = Number(v.slice(5, 7)) - 1
}
watch(selected, syncView, { immediate: true })

const minIso = computed(() => (props.min ? props.min.slice(0, 10) : null))
const maxIso = computed(() => (props.max ? props.max.slice(0, 10) : null))

const displayText = computed(() => (selected.value ? formatDateShort(selected.value) : props.placeholder))
const showClear = computed(() => props.clearable && !!selected.value && !props.disabled)
const describedBy = computed(() => {
  if (props.error) return `${uid}-err`
  if (props.hint) return `${uid}-hint`
  return undefined
})

function openPanel() {
  if (props.disabled || open.value) return
  open.value = true
  syncView()
  start()
  nextTick(() => {
    // Medir el panel ya renderizado: la estimación puede quedarse corta y era
    // lo que hacía que se saliera de la pantalla al abrir hacia arriba.
    floatingEl.value = panelEl()
    update()
  })
}

function closePanel() {
  if (!open.value) return
  open.value = false
  stop()
}

function toggle() {
  open.value ? closePanel() : openPanel()
}

useClickOutside([triggerRef, panelEl], closePanel, { enabled: open })

function pick(iso: string) {
  emit('update:modelValue', iso)
  emit('change', iso)
  closePanel()
  triggerRef.value?.focus()
}

function clear() {
  emit('update:modelValue', null)
  emit('change', null)
  closePanel()
}

function goToday() {
  const t = new Date()
  viewMonth.value = t.getMonth()
  viewYear.value = t.getFullYear()
  const iso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  if ((minIso.value && iso < minIso.value) || (maxIso.value && iso > maxIso.value)) return
  pick(iso)
}

function onKeydown(event: KeyboardEvent) {
  if (props.disabled) return
  if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
    event.preventDefault()
    openPanel()
  } else if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    closePanel()
  }
}
</script>

<template>
  <div
    class="dp"
    :class="[`dp--${props.size}`, { 'dp--open': open, 'dp--error': !!props.error, 'dp--disabled': props.disabled }]"
  >
    <label v-if="props.label" class="dp__label" :for="uid">
      {{ props.label }}
      <span v-if="props.required" class="dp__req" aria-hidden="true">*</span>
    </label>

    <button
      :id="uid"
      ref="triggerRef"
      class="dp__trigger"
      type="button"
      :aria-haspopup="'dialog'"
      :aria-expanded="open"
      :aria-describedby="describedBy"
      :disabled="props.disabled"
      @click="toggle"
      @keydown="onKeydown"
    >
      <i class="dp__icon fa-solid fa-calendar-days" aria-hidden="true" />
      <span class="dp__value" :class="{ 'dp__value--placeholder': !selected }">{{ displayText }}</span>

      <span
        v-if="showClear"
        class="dp__clear"
        role="button"
        tabindex="-1"
        aria-label="Limpiar fecha"
        @click.stop="clear"
      >
        <i class="fa-solid fa-xmark" aria-hidden="true" />
      </span>

      <i class="dp__caret fa-solid fa-chevron-down" aria-hidden="true" />
    </button>

    <Transition name="fade-slide" mode="out-in">
      <p v-if="props.error" :id="`${uid}-err`" class="dp__msg dp__msg--error" role="alert">
        <i class="fa-solid fa-circle-exclamation" aria-hidden="true" />
        {{ props.error }}
      </p>
      <p v-else-if="props.hint" :id="`${uid}-hint`" class="dp__msg">{{ props.hint }}</p>
    </Transition>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="open && isMobile" class="dp__backdrop" @click="closePanel" />
      </Transition>

      <Transition :name="isMobile ? 'sheet' : 'scale-pop'">
        <BaseDatePickerPanel
          v-if="open"
          ref="panelRef"
          :selected="selected"
          :month="viewMonth"
          :year="viewYear"
          :min="minIso"
          :max="maxIso"
          :mobile="isMobile"
          :position="position"
          :clearable="props.clearable"
          :title="props.label || 'Selecciona una fecha'"
          @pick="pick"
          @update:month="viewMonth = $event"
          @update:year="viewYear = $event"
          @today="goToday"
          @clear="clear"
          @close="closePanel"
        />
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.dp {
  @include flex-col($sp-2);
  width: 100%;
  min-width: 0;
}

.dp__label {
  @include label-text;
  @include flex(row, flex-start, center, 3px);
  transition: color $transition-base;
}
.dp--open .dp__label { color: $primary; }
.dp--error .dp__label { color: $alert-error; }
.dp__req { color: $primary; }

.dp__trigger {
  @include flex(row, flex-start, center, $sp-2);
  width: 100%;
  min-width: 0;
  height: 42px;
  padding: 0 $sp-3;
  background: $surface;
  border: 1px solid $border-color;
  border-radius: $radius-sm;
  text-align: left;
  transition: border-color $transition-base, box-shadow $transition-base, background $transition-base;

  &:hover:not(:disabled) { border-color: $border-strong; }
  &:focus-visible { @include focus-ring; }
  &:disabled { cursor: not-allowed; opacity: 0.65; background: rgba($primary-dark, 0.04); }
}

.dp--open .dp__trigger { @include focus-ring; }
.dp--error .dp__trigger { border-color: $alert-error; }

.dp__icon {
  flex: none;
  color: $text-secondary;
  font-size: $fs-sm;
  transition: color $transition-base, transform $transition-base;
}
.dp--open .dp__icon { color: $primary; transform: scale(1.1); }

.dp__value {
  flex: 1 1 auto;
  min-width: 0;
  font-size: $fs-base;
  color: $primary-dark;
  @include truncate;

  &--placeholder { color: rgba($primary-dark, 0.35); }
}

.dp__clear {
  @include flex-center;
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: $radius-full;
  color: $text-secondary;
  font-size: $fs-xs;
  cursor: pointer;
  transition: background $transition-fast, color $transition-fast, transform $transition-fast;

  &:hover { background: rgba($primary-dark, 0.08); color: $primary; transform: rotate(90deg); }
}

.dp__caret {
  flex: none;
  color: $text-secondary;
  font-size: $fs-xs;
  transition: transform $transition-base, color $transition-base;
}
.dp--open .dp__caret { transform: rotate(180deg); color: $primary; }

.dp__msg {
  font-size: $fs-xs;
  color: $text-secondary;
  @include flex(row, flex-start, center, $sp-1);

  &--error { color: $alert-error; font-weight: 600; }
}

.dp__backdrop {
  position: fixed;
  inset: 0;
  z-index: calc(#{$z-dropdown} - 1);
  background: rgba($primary-dark, 0.45);
  backdrop-filter: blur(2px);
}

.dp--sm .dp__trigger { height: 34px; padding: 0 $sp-2; }
.dp--sm .dp__value { font-size: $fs-sm; }
.dp--lg .dp__trigger { height: 52px; padding: 0 $sp-4; }
.dp--lg .dp__value { font-size: $fs-md; }
</style>

<style lang="scss">
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
