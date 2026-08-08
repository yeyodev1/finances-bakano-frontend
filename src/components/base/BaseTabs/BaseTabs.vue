<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import type { TabItem } from './types'

interface Props {
  modelValue: string | number
  tabs: TabItem[]
  variant?: 'underline' | 'pills'
  block?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'underline',
  block: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  change: [value: string | number]
}>()

const uid = useId()
const listRef = ref<HTMLElement | null>(null)
const indicator = ref({ left: 0, width: 0 })
let observer: ResizeObserver | null = null

function activeIndex() {
  return props.tabs.findIndex((t) => t.value === props.modelValue)
}

function syncIndicator() {
  const list = listRef.value
  if (!list) return
  const buttons = list.querySelectorAll<HTMLElement>('[role="tab"]')
  const el = buttons[activeIndex()]
  if (!el) {
    indicator.value = { left: 0, width: 0 }
    return
  }
  indicator.value = { left: el.offsetLeft, width: el.offsetWidth }
  el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
}

function select(tab: TabItem) {
  if (tab.disabled || tab.value === props.modelValue) return
  emit('update:modelValue', tab.value)
  emit('change', tab.value)
}

function onKeydown(event: KeyboardEvent) {
  const dir = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
  if (!dir && event.key !== 'Home' && event.key !== 'End') return
  event.preventDefault()

  const list = props.tabs
  if (!list.length) return

  let next = event.key === 'Home' ? 0 : event.key === 'End' ? list.length - 1 : activeIndex()
  if (dir) {
    for (let i = 0; i < list.length; i += 1) {
      next = (next + dir + list.length) % list.length
      if (!list[next]?.disabled) break
    }
  }
  const target = list[next]
  if (target) select(target)
}

watch(() => props.modelValue, () => nextTick(syncIndicator))
watch(() => props.tabs, () => nextTick(syncIndicator), { deep: true })

onMounted(() => {
  nextTick(syncIndicator)
  if (typeof ResizeObserver !== 'undefined' && listRef.value) {
    observer = new ResizeObserver(() => syncIndicator())
    observer.observe(listRef.value)
  }
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="tabs" :class="[`tabs--${props.variant}`, { 'tabs--block': props.block }]">
    <div
      ref="listRef"
      class="tabs__list"
      role="tablist"
      :aria-label="`Pestañas ${uid}`"
      @keydown="onKeydown"
    >
      <button
        v-for="tab in props.tabs"
        :key="tab.value"
        class="tabs__tab"
        :class="{ 'tabs__tab--active': tab.value === props.modelValue }"
        type="button"
        role="tab"
        :aria-selected="tab.value === props.modelValue"
        :tabindex="tab.value === props.modelValue ? 0 : -1"
        :disabled="tab.disabled"
        @click="select(tab)"
      >
        <i v-if="tab.icon" class="tabs__icon" :class="tab.icon" aria-hidden="true" />
        <span class="tabs__label">{{ tab.label }}</span>
        <span v-if="tab.badge !== undefined" class="tabs__badge">{{ tab.badge }}</span>
      </button>

      <span
        class="tabs__indicator"
        :style="{ transform: `translateX(${indicator.left}px)`, width: `${indicator.width}px` }"
        aria-hidden="true"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.tabs {
  width: 100%;
  min-width: 0;
}

.tabs__list {
  @include scrollbar(0);
  position: relative;
  display: flex;
  align-items: stretch;
  gap: $sp-1;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  border-bottom: 1px solid $border-color;

  &::-webkit-scrollbar { display: none; }
}

.tabs--block .tabs__list .tabs__tab { flex: 1 1 0; }

.tabs__tab {
  @include flex-center($sp-2);
  flex: none;
  white-space: nowrap;
  padding: $sp-3 $sp-4;
  font-size: $fs-sm;
  font-weight: 600;
  color: $text-secondary;
  border-radius: $radius-sm $radius-sm 0 0;
  transition: color $transition-base, background $transition-base, transform $transition-fast;

  &:hover:not(:disabled) {
    color: $primary-dark;
    background: rgba($primary-dark, 0.04);
  }
  &:focus-visible { @include focus-ring; }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
  &--active { color: $primary; }
}

.tabs__icon { font-size: 0.9em; }

.tabs__label { @include truncate; }

.tabs__badge {
  @include flex-center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: $radius-full;
  background: rgba($primary-dark, 0.08);
  color: $text-secondary;
  font-size: 0.62rem;
  font-weight: 700;
  transition: background $transition-base, color $transition-base;

  .tabs__tab--active & { background: rgba($primary, 0.14); color: $primary; }
}

.tabs__indicator {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 3px;
  border-radius: $radius-full $radius-full 0 0;
  @include gradient-primary;
  transition: transform 0.32s $ease-out, width 0.32s $ease-out;
  will-change: transform, width;
}

// ── Variante pills ───────────────────────────────────────────────
.tabs--pills {
  .tabs__list {
    border-bottom: none;
    background: rgba($primary-dark, 0.05);
    border-radius: $radius-full;
    padding: 4px;
    gap: 2px;
  }

  .tabs__tab {
    border-radius: $radius-full;
    padding: $sp-2 $sp-4;
    z-index: 1;

    &:hover:not(:disabled) { background: transparent; }
    &--active { color: $white; }
  }

  .tabs__badge { background: rgba($white, 0.22); color: inherit; }

  .tabs__indicator {
    top: 4px;
    bottom: 4px;
    height: auto;
    border-radius: $radius-full;
    z-index: 0;
    box-shadow: $shadow-xs;
  }
}
</style>
