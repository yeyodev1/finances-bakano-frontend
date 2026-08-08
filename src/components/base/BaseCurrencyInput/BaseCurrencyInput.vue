<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'

interface Props {
  modelValue?: number | null
  label?: string
  placeholder?: string
  error?: string
  hint?: string
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  clearable?: boolean
  symbol?: string
  size?: 'sm' | 'md' | 'lg'
  min?: number
  max?: number
  allowNegative?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  label: '',
  placeholder: '0,00',
  error: '',
  hint: '',
  required: false,
  disabled: false,
  readonly: false,
  clearable: false,
  symbol: '$',
  size: 'md',
  allowNegative: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
}>()

const uid = useId()
const inputEl = ref<HTMLInputElement | null>(null)
const focused = ref(false)
const display = ref('')

/** 1234.5 → "1.234,50" (es-EC: punto de miles, coma decimal) */
function format(value: number, decimals = 2): string {
  return new Intl.NumberFormat('es-EC', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: 2,
  }).format(value)
}

/** Agrupa la parte entera con puntos, conservando lo que el usuario escribe. */
function formatWhileTyping(raw: string): string {
  const negative = props.allowNegative && raw.trim().startsWith('-')
  let cleaned = raw.replace(/[^\d,.]/g, '')
  // El punto se trata como separador de miles → se descarta; la coma es el decimal
  cleaned = cleaned.replace(/\./g, '')
  const parts = cleaned.split(',')
  const intPart = (parts[0] || '').replace(/^0+(?=\d)/, '')
  const decPart = parts.length > 1 ? parts.slice(1).join('').slice(0, 2) : null

  const grouped = intPart ? new Intl.NumberFormat('es-EC').format(Number(intPart)) : ''
  let out = grouped
  if (decPart !== null) out = `${grouped || '0'},${decPart}`
  return negative && out ? `-${out}` : out
}

function parse(text: string): number | null {
  if (!text) return null
  const normalized = text.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
  if (!normalized || normalized === '-' || normalized === '.') return null
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

function syncFromModel() {
  if (focused.value) return
  const v = props.modelValue
  display.value = v === null || v === undefined || Number.isNaN(v) ? '' : format(v)
}

watch(() => props.modelValue, syncFromModel, { immediate: true })

function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  const formatted = formatWhileTyping(target.value)
  display.value = formatted
  target.value = formatted
  emit('update:modelValue', parse(formatted))
}

function onFocus(event: FocusEvent) {
  focused.value = true
  emit('focus', event)
}

function onBlur(event: FocusEvent) {
  focused.value = false
  let value = parse(display.value)
  if (value !== null) {
    if (props.min !== undefined && value < props.min) value = props.min
    if (props.max !== undefined && value > props.max) value = props.max
    if (!props.allowNegative && value < 0) value = Math.abs(value)
    emit('update:modelValue', value)
    display.value = format(value)
  } else {
    display.value = ''
    emit('update:modelValue', null)
  }
  emit('blur', event)
}

function clear() {
  display.value = ''
  emit('update:modelValue', null)
  inputEl.value?.focus()
}

const showClear = computed(
  () => props.clearable && display.value !== '' && !props.disabled && !props.readonly,
)
const describedBy = computed(() => {
  if (props.error) return `${uid}-err`
  if (props.hint) return `${uid}-hint`
  return undefined
})

defineExpose({ focus: () => inputEl.value?.focus() })
</script>

<template>
  <div
    class="cur"
    :class="[
      `cur--${props.size}`,
      { 'cur--error': !!props.error, 'cur--disabled': props.disabled, 'cur--focused': focused },
    ]"
  >
    <label v-if="props.label" class="cur__label" :for="uid">
      {{ props.label }}
      <span v-if="props.required" class="cur__req" aria-hidden="true">*</span>
    </label>

    <div class="cur__control">
      <span class="cur__symbol">{{ props.symbol }}</span>

      <input
        :id="uid"
        ref="inputEl"
        class="cur__input"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        :value="display"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :readonly="props.readonly"
        :required="props.required"
        :aria-invalid="!!props.error || undefined"
        :aria-describedby="describedBy"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
      />

      <Transition name="fade">
        <button
          v-if="showClear"
          class="cur__btn"
          type="button"
          tabindex="-1"
          aria-label="Limpiar monto"
          @click="clear"
        >
          <i class="fa-solid fa-xmark" aria-hidden="true" />
        </button>
      </Transition>

      <span class="cur__currency">USD</span>
    </div>

    <Transition name="fade-slide" mode="out-in">
      <p v-if="props.error" :id="`${uid}-err`" class="cur__msg cur__msg--error" role="alert">
        <i class="fa-solid fa-circle-exclamation" aria-hidden="true" />
        {{ props.error }}
      </p>
      <p v-else-if="props.hint" :id="`${uid}-hint`" class="cur__msg">{{ props.hint }}</p>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.cur {
  @include flex-col($sp-2);
  width: 100%;
  min-width: 0;
}

.cur__label {
  @include label-text;
  @include flex(row, flex-start, center, 3px);
  transition: color $transition-base;
}
.cur--focused .cur__label { color: $primary; }
.cur--error .cur__label { color: $alert-error; }
.cur__req { color: $primary; }

.cur__control {
  @include flex(row, flex-start, center, $sp-2);
  background: $surface;
  border: 1px solid $border-color;
  border-radius: $radius-sm;
  padding: 0 $sp-3;
  transition: border-color $transition-base, box-shadow $transition-base, background $transition-base;

  &:hover { border-color: $border-strong; }
}

.cur--focused .cur__control { @include focus-ring; }
.cur--error .cur__control { border-color: $alert-error; background: rgba($alert-error, 0.03); }
.cur--error.cur--focused .cur__control { @include focus-ring($alert-error); }
.cur--disabled .cur__control { background: rgba($primary-dark, 0.04); opacity: 0.7; }

.cur__symbol {
  flex: none;
  font-weight: 700;
  font-size: $fs-md;
  color: $primary;
  transition: transform $transition-base;
}
.cur--focused .cur__symbol { transform: scale(1.1); }

.cur__input {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: $fs-md;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: $primary-dark;
  text-align: right;
  height: 42px;

  &::placeholder { color: rgba($primary-dark, 0.3); font-weight: 400; }
  &:disabled { cursor: not-allowed; }
}

.cur__currency {
  flex: none;
  font-size: $fs-xs;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: $text-secondary;
  background: rgba($primary-dark, 0.05);
  border-radius: $radius-xs;
  padding: 3px 6px;
}

.cur__btn {
  @include flex-center;
  flex: none;
  width: 24px;
  height: 24px;
  border-radius: $radius-full;
  color: $text-secondary;
  font-size: $fs-xs;
  transition: background $transition-fast, color $transition-fast, transform $transition-fast;

  &:hover { background: rgba($primary-dark, 0.07); color: $primary; transform: scale(1.1); }
}

.cur__msg {
  font-size: $fs-xs;
  color: $text-secondary;
  @include flex(row, flex-start, center, $sp-1);

  &--error { color: $alert-error; font-weight: 600; }
}

// ── Tamaños ──────────────────────────────────────────────────────
.cur--sm .cur__input { height: 34px; font-size: $fs-base; }
.cur--sm .cur__symbol { font-size: $fs-base; }
.cur--lg .cur__input { height: 52px; font-size: $fs-lg; }
.cur--lg .cur__symbol { font-size: $fs-lg; }
</style>
