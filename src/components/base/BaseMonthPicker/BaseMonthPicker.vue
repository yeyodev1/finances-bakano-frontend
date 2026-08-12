<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useClickOutside } from '@/composables/useClickOutside'
import { useFloatingPanel } from '@/composables/useFloatingPanel'
import { MONTHS_ES, MONTHS_ES_SHORT } from '@/composables/useFormat'

interface Props {
  /** Período en formato YYYY-MM. */
  modelValue: string
  label?: string
  min?: string | null
  max?: string | null
  disabled?: boolean
  error?: string
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  min: null,
  max: null,
  disabled: false,
  error: '',
  size: 'md',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
}>()

const uid = useId()
const { isMobile } = useBreakpoint()
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const open = ref(false)

const { position, panelRef: floatingEl, update, start, stop } = useFloatingPanel(triggerRef, {
  estimatedHeight: 300,
  matchWidth: false,
  minWidth: 280,
})

const pad = (n: number) => String(n).padStart(2, '0')

const parts = computed(() => {
  const m = /^(\d{4})-(\d{1,2})$/.exec(props.modelValue || '')
  if (!m) {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  }
  return { year: Number(m[1]), month: Number(m[2]) - 1 }
})

const viewYear = ref(parts.value.year)
watch(() => props.modelValue, () => { viewYear.value = parts.value.year })

const displayText = computed(() => `${MONTHS_ES[parts.value.month] ?? ''} ${parts.value.year}`)

function inRange(period: string) {
  if (props.min && period < props.min) return false
  if (props.max && period > props.max) return false
  return true
}

function commit(year: number, month: number) {
  const period = `${year}-${pad(month + 1)}`
  if (!inRange(period)) return
  emit('update:modelValue', period)
  emit('change', period)
}

function step(delta: number) {
  let m = parts.value.month + delta
  let y = parts.value.year
  if (m < 0) { m = 11; y -= 1 }
  if (m > 11) { m = 0; y += 1 }
  commit(y, m)
}

function openPanel() {
  if (props.disabled || open.value) return
  open.value = true
  viewYear.value = parts.value.year
  start()
  nextTick(() => {
    // Medir el panel real en vez de fiarse de la estimación.
    floatingEl.value = panelRef.value
    update()
  })
}

function closePanel() {
  if (!open.value) return
  open.value = false
  stop()
}

useClickOutside([triggerRef, panelRef], closePanel, { enabled: open })

function pickMonth(index: number) {
  commit(viewYear.value, index)
  closePanel()
  triggerRef.value?.focus()
}

function onKeydown(event: KeyboardEvent) {
  if (props.disabled) return
  if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1) }
  else if (event.key === 'ArrowRight') { event.preventDefault(); step(1) }
  else if (event.key === 'Escape' && open.value) { event.preventDefault(); closePanel() }
  else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open.value ? closePanel() : openPanel() }
}

const panelStyle = computed(() => {
  if (isMobile.value) return undefined
  const { top, left, placement, maxHeight } = position
  return {
    top: `${top}px`,
    left: `${left}px`,
    // Recortado al hueco real: si no cabe entero, scrollea en vez de salirse.
    maxHeight: `${maxHeight}px`,
    overflowY: 'auto' as const,
    transform: placement === 'top' ? 'translateY(-100%)' : undefined,
  }
})
</script>

<template>
  <div class="mp" :class="[`mp--${props.size}`, { 'mp--open': open, 'mp--error': !!props.error, 'mp--disabled': props.disabled }]">
    <span v-if="props.label" class="mp__label">{{ props.label }}</span>

    <div class="mp__bar">
      <button class="mp__nav" type="button" aria-label="Mes anterior" :disabled="props.disabled" @click="step(-1)">
        <i class="fa-solid fa-chevron-left" aria-hidden="true" />
      </button>

      <button
        :id="uid"
        ref="triggerRef"
        class="mp__trigger"
        type="button"
        aria-haspopup="dialog"
        :aria-expanded="open"
        :disabled="props.disabled"
        @click="open ? closePanel() : openPanel()"
        @keydown="onKeydown"
      >
        <i class="fa-solid fa-calendar-days" aria-hidden="true" />
        <span class="mp__value">{{ displayText }}</span>
        <i class="mp__caret fa-solid fa-chevron-down" aria-hidden="true" />
      </button>

      <button class="mp__nav" type="button" aria-label="Mes siguiente" :disabled="props.disabled" @click="step(1)">
        <i class="fa-solid fa-chevron-right" aria-hidden="true" />
      </button>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="open && isMobile" class="mp__backdrop" @click="closePanel" />
      </Transition>

      <Transition :name="isMobile ? 'sheet' : 'scale-pop'">
        <div v-if="open" ref="panelRef" class="mp__panel" :class="{ 'mp__panel--sheet': isMobile }" :style="panelStyle" role="dialog">
          <header class="mp__panel-head">
            <button class="mp__nav" type="button" aria-label="Año anterior" @click="viewYear -= 1">
              <i class="fa-solid fa-chevron-left" aria-hidden="true" />
            </button>
            <span class="mp__year">{{ viewYear }}</span>
            <button class="mp__nav" type="button" aria-label="Año siguiente" @click="viewYear += 1">
              <i class="fa-solid fa-chevron-right" aria-hidden="true" />
            </button>
          </header>

          <div class="mp__months">
            <button
              v-for="(m, i) in MONTHS_ES_SHORT"
              :key="m"
              class="mp__month"
              :class="{ 'mp__month--on': i === parts.month && viewYear === parts.year }"
              type="button"
              :disabled="!inRange(`${viewYear}-${String(i + 1).padStart(2, '0')}`)"
              @click="pickMonth(i)"
            >{{ m }}</button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.mp {
  @include flex-col($sp-2);
  min-width: 0;

  &--disabled { opacity: 0.6; }
}

.mp__label { @include label-text; }

.mp__bar {
  @include flex(row, flex-start, center, $sp-1);
  background: $surface;
  border: 1px solid $border-color;
  border-radius: $radius-full;
  padding: 3px;
  transition: border-color $transition-base, box-shadow $transition-base;
}

.mp--open .mp__bar { @include focus-ring; }
.mp--error .mp__bar { border-color: $alert-error; }

.mp__nav {
  @include flex-center;
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: $radius-full;
  color: $primary-dark;
  font-size: $fs-xs;
  transition: background $transition-fast, color $transition-fast, transform $transition-fast;

  &:hover:not(:disabled) { background: rgba($primary, 0.12); color: $primary; transform: scale(1.12); }
  &:active:not(:disabled) { transform: scale(0.9); }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
}

.mp__trigger {
  @include flex-center($sp-2);
  flex: 1 1 auto;
  min-width: 0;
  height: 32px;
  padding: 0 $sp-3;
  border-radius: $radius-full;
  font-size: $fs-sm;
  font-weight: 700;
  color: $primary-dark;
  white-space: nowrap;
  transition: background $transition-fast, color $transition-fast;

  &:hover:not(:disabled) { background: rgba($primary, 0.08); color: $primary; }
  &:focus-visible { @include focus-ring; }
}

.mp__value { @include truncate; }

.mp__caret {
  font-size: 0.6rem;
  color: $text-secondary;
  transition: transform $transition-base;
}
.mp--open .mp__caret { transform: rotate(180deg); }

.mp__backdrop {
  position: fixed;
  inset: 0;
  z-index: calc(#{$z-dropdown} - 1);
  background: rgba($primary-dark, 0.45);
  backdrop-filter: blur(2px);
}

.mp__panel {
  position: fixed;
  z-index: $z-dropdown;
  width: 280px;
  background: $surface;
  border: 1px solid $border-color;
  border-radius: $radius-md;
  box-shadow: $shadow-lg;
  padding: $sp-3;
  transform-origin: top center;

  &--sheet {
    inset: auto 0 0 0;
    width: 100%;
    border-radius: $radius-lg $radius-lg 0 0;
    padding: $sp-4 $sp-4 calc(#{$sp-4} + env(safe-area-inset-bottom, 0px));
  }
}

.mp__panel-head {
  @include flex-between($gap: $sp-2);
  margin-bottom: $sp-3;
}

.mp__year {
  font-size: $fs-md;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.mp__months {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $sp-2;
}

.mp__month {
  padding: $sp-3 $sp-2;
  border-radius: $radius-sm;
  font-size: $fs-sm;
  font-weight: 600;
  color: $primary-dark;
  transition: background $transition-fast, color $transition-fast, transform $transition-fast;

  &:hover:not(:disabled) { background: rgba($primary, 0.1); color: $primary; transform: translateY(-2px); }
  &:disabled { opacity: 0.3; cursor: not-allowed; }

  &--on {
    background: $primary;
    color: $white;
    box-shadow: $shadow-primary;
    &:hover { background: darken($primary, 5); color: $white; }
  }
}

.mp--sm .mp__trigger { font-size: $fs-xs; }
.mp--lg .mp__trigger { height: 40px; font-size: $fs-base; }
.mp--lg .mp__nav { width: 40px; height: 40px; }
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
