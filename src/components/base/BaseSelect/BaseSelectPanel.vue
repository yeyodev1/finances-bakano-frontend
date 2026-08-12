<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { SelectOption } from '@/types'
import type { FloatingPosition } from '@/composables/useFloatingPanel'
import BaseSelectOption from './BaseSelectOption.vue'

interface Props {
  options: SelectOption[]
  selectedValues: Array<string | number | null>
  activeIndex: number
  multiple?: boolean
  searchable?: boolean
  search?: string
  mobile?: boolean
  position: FloatingPosition
  listId: string
  title?: string
  emptyText?: string
}

const props = withDefaults(defineProps<Props>(), {
  multiple: false,
  searchable: false,
  search: '',
  mobile: false,
  title: 'Seleccionar',
  emptyText: 'Sin resultados',
})

const emit = defineEmits<{
  select: [option: SelectOption]
  hover: [index: number]
  'update:search': [value: string]
  keydown: [event: KeyboardEvent]
  close: []
}>()

const el = ref<HTMLElement | null>(null)
const searchEl = ref<HTMLInputElement | null>(null)

onMounted(() => {
  if (props.searchable && !props.mobile) searchEl.value?.focus()
})

const isSelected = (option: SelectOption) => props.selectedValues.includes(option.value)

const panelStyle = computed(() => {
  if (props.mobile) return undefined
  const { top, left, width, placement, maxHeight } = props.position
  return {
    top: `${top}px`,
    left: `${left}px`,
    // Recortado al hueco real: si no cabe entero, scrollea en vez de salirse.
    maxHeight: `${maxHeight}px`,
    width: `${width}px`,
    transform: placement === 'top' ? 'translateY(-100%)' : undefined,
  }
})

defineExpose({ el })
</script>

<template>
  <div
    ref="el"
    class="sel-panel"
    :class="{ 'sel-panel--sheet': props.mobile, 'sel-panel--up': props.position.placement === 'top' }"
    :style="panelStyle"
  >
    <header v-if="props.mobile" class="sel-panel__head">
      <span class="sel-panel__title">{{ props.title }}</span>
      <button class="sel-panel__close" type="button" aria-label="Cerrar" @click="emit('close')">
        <i class="fa-solid fa-xmark" aria-hidden="true" />
      </button>
    </header>

    <div v-if="props.searchable" class="sel-panel__search">
      <i class="fa-solid fa-magnifying-glass" aria-hidden="true" />
      <input
        ref="searchEl"
        class="sel-panel__search-input"
        type="text"
        autocomplete="off"
        placeholder="Buscar…"
        :value="props.search"
        aria-label="Buscar opción"
        @input="emit('update:search', ($event.target as HTMLInputElement).value)"
        @keydown="emit('keydown', $event)"
      />
    </div>

    <ul :id="props.listId" class="sel-panel__list" role="listbox" :aria-multiselectable="props.multiple || undefined">
      <BaseSelectOption
        v-for="(option, i) in props.options"
        :key="`${String(option.value)}-${i}`"
        :option="option"
        :index="i"
        :multiple="props.multiple"
        :selected="isSelected(option)"
        :active="i === props.activeIndex"
        @select="emit('select', $event)"
        @hover="emit('hover', $event)"
      />

      <li v-if="!props.options.length" class="sel-panel__empty">
        <i class="fa-solid fa-magnifying-glass-minus" aria-hidden="true" />
        <span>{{ props.emptyText }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.sel-panel {
  position: fixed;
  z-index: $z-dropdown;
  @include flex-col;
  background: $surface;
  border: 1px solid $border-color;
  border-radius: $radius-md;
  box-shadow: $shadow-lg;
  overflow: hidden;
  transform-origin: top center;

  &--up { transform-origin: bottom center; }

  // Hoja inferior en móvil
  &--sheet {
    inset: auto 0 0 0;
    width: 100%;
    max-height: 78dvh;
    border-radius: $radius-lg $radius-lg 0 0;
    border-bottom: none;
    padding-bottom: env(safe-area-inset-bottom, 0);
  }
}

.sel-panel__head {
  position: relative;
  @include flex-between;
  padding: $sp-5 $sp-4 $sp-4;
  border-bottom: 1px solid $border-color;
  flex: none;

  &::before {
    content: '';
    position: absolute;
    top: 7px;
    left: 50%;
    transform: translateX(-50%);
    width: 42px;
    height: 4px;
    border-radius: $radius-full;
    background: rgba($primary-dark, 0.18);
  }
}

.sel-panel__title {
  font-size: $fs-base;
  font-weight: 700;
}

.sel-panel__close {
  @include flex-center;
  width: 32px;
  height: 32px;
  border-radius: $radius-full;
  color: $text-secondary;
  transition: background $transition-fast, transform $transition-fast;

  &:hover { background: rgba($primary-dark, 0.07); transform: rotate(90deg); }
}

.sel-panel__search {
  @include flex(row, flex-start, center, $sp-2);
  padding: $sp-3;
  border-bottom: 1px solid $border-color;
  color: $text-secondary;
  font-size: $fs-sm;
  flex: none;
}

.sel-panel__search-input {
  flex: 1 1 auto;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: $fs-base;
  color: $primary-dark;

  @include md { font-size: $fs-sm; }
  &::placeholder { color: rgba($primary-dark, 0.35); }
}

.sel-panel__list {
  @include scrollbar(6px);
  @include flex-col(2px);
  padding: $sp-2;
  overflow-y: auto;
  max-height: 60dvh;
  overscroll-behavior: contain;

  @include md {
    max-height: 280px;
  }
}

.sel-panel__empty {
  @include flex(column, center, center, $sp-2);
  padding: $sp-8 $sp-4;
  color: $text-secondary;
  font-size: $fs-sm;
  text-align: center;

  i { font-size: $fs-lg; opacity: 0.5; }
}
</style>
