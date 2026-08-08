<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'

interface Props {
  modelValue?: string
  placeholder?: string
  debounce?: number
  disabled?: boolean
  loading?: boolean
  size?: 'sm' | 'md' | 'lg'
  label?: string
  autofocus?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'Buscar…',
  debounce: 300,
  disabled: false,
  loading: false,
  size: 'md',
  label: '',
  autofocus: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  search: [value: string]
  clear: []
}>()

const uid = useId()
const inputEl = ref<HTMLInputElement | null>(null)
const inner = ref(props.modelValue)
const focused = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.modelValue,
  (v) => {
    if (v !== inner.value) inner.value = v
  },
)

function flush() {
  emit('update:modelValue', inner.value)
  emit('search', inner.value)
}

function schedule() {
  if (timer) clearTimeout(timer)
  if (props.debounce <= 0) {
    flush()
    return
  }
  timer = setTimeout(flush, props.debounce)
}

function onInput(event: Event) {
  inner.value = (event.target as HTMLInputElement).value
  schedule()
}

function clear() {
  inner.value = ''
  if (timer) clearTimeout(timer)
  emit('update:modelValue', '')
  emit('search', '')
  emit('clear')
  inputEl.value?.focus()
}

function onEnter() {
  if (timer) clearTimeout(timer)
  flush()
}

function onEscape() {
  if (inner.value) clear()
  else inputEl.value?.blur()
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})

const hasValue = computed(() => inner.value.length > 0)

defineExpose({ focus: () => inputEl.value?.focus(), clear })
</script>

<template>
  <div
    class="search"
    :class="[`search--${props.size}`, { 'search--focused': focused, 'search--disabled': props.disabled }]"
    role="search"
  >
    <label v-if="props.label" class="search__label" :for="uid">{{ props.label }}</label>

    <div class="search__control">
      <i
        class="search__icon"
        :class="props.loading ? 'fa-solid fa-circle-notch search__icon--spin' : 'fa-solid fa-magnifying-glass'"
        aria-hidden="true"
      />

      <input
        :id="uid"
        ref="inputEl"
        class="search__input"
        type="search"
        autocomplete="off"
        :value="inner"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :autofocus="props.autofocus"
        :aria-label="props.label || props.placeholder"
        @input="onInput"
        @focus="focused = true"
        @blur="focused = false"
        @keydown.enter.prevent="onEnter"
        @keydown.esc.prevent="onEscape"
      />

      <Transition name="fade">
        <button
          v-if="hasValue"
          class="search__clear"
          type="button"
          aria-label="Limpiar búsqueda"
          @click="clear"
        >
          <i class="fa-solid fa-xmark" aria-hidden="true" />
        </button>
      </Transition>
    </div>
  </div>
</template>

<style scoped lang="scss">
.search {
  @include flex-col($sp-2);
  width: 100%;
  min-width: 0;

  @include md {
    max-width: 420px;
  }
}

.search__label {
  @include label-text;
}

.search__control {
  @include flex(row, flex-start, center, $sp-2);
  background: $surface;
  border: 1px solid $border-color;
  border-radius: $radius-full;
  padding: 0 $sp-4;
  transition: border-color $transition-base, box-shadow $transition-base, background $transition-base;

  &:hover { border-color: $border-strong; }
}

.search--focused .search__control {
  @include focus-ring;
  background: $white;
}

.search--disabled .search__control {
  background: rgba($primary-dark, 0.04);
  opacity: 0.7;
  pointer-events: none;
}

.search__icon {
  flex: none;
  color: $text-secondary;
  font-size: $fs-sm;
  transition: color $transition-base, transform $transition-base;

  &--spin { animation: spin 0.8s linear infinite; }
}

.search--focused .search__icon {
  color: $primary;
  transform: scale(1.1);
}

.search__input {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  height: 42px;
  border: none;
  outline: none;
  background: transparent;
  font-size: $fs-base;
  color: $primary-dark;

  &::placeholder { color: rgba($primary-dark, 0.35); }

  &::-webkit-search-cancel-button,
  &::-webkit-search-decoration {
    -webkit-appearance: none;
    appearance: none;
  }
}

.search__clear {
  @include flex-center;
  flex: none;
  width: 24px;
  height: 24px;
  border-radius: $radius-full;
  color: $text-secondary;
  font-size: $fs-xs;
  transition: background $transition-fast, color $transition-fast, transform $transition-fast;

  &:hover { background: rgba($primary-dark, 0.08); color: $primary; transform: rotate(90deg); }
}

// ── Tamaños ──────────────────────────────────────────────────────
.search--sm {
  .search__control { padding: 0 $sp-3; }
  .search__input { height: 34px; font-size: $fs-sm; }
}
.search--lg .search__input { height: 52px; font-size: $fs-md; }
</style>
