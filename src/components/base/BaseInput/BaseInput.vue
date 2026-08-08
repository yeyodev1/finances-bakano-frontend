<script setup lang="ts">
import { computed, ref, useId } from 'vue'

interface Props {
  modelValue?: string | number | null
  label?: string
  placeholder?: string
  type?: 'text' | 'email' | 'password' | 'number' | 'tel'
  icon?: string
  error?: string
  hint?: string
  required?: boolean
  disabled?: boolean
  clearable?: boolean
  readonly?: boolean
  autocomplete?: string
  maxlength?: number
  min?: number | string
  max?: number | string
  step?: number | string
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  label: '',
  placeholder: '',
  type: 'text',
  icon: '',
  error: '',
  hint: '',
  required: false,
  disabled: false,
  clearable: false,
  readonly: false,
  autocomplete: 'off',
  size: 'md',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number | null]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
  enter: [event: KeyboardEvent]
  clear: []
}>()

const uid = useId()
const inputEl = ref<HTMLInputElement | null>(null)
const focused = ref(false)
const showPassword = ref(false)

const isPassword = computed(() => props.type === 'password')
const resolvedType = computed(() => (isPassword.value && showPassword.value ? 'text' : props.type))
const hasValue = computed(() => props.modelValue !== null && props.modelValue !== undefined && String(props.modelValue) !== '')
const showClear = computed(() => props.clearable && hasValue.value && !props.disabled && !props.readonly)
const describedBy = computed(() => {
  if (props.error) return `${uid}-err`
  if (props.hint) return `${uid}-hint`
  return undefined
})

function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  if (props.type === 'number') {
    emit('update:modelValue', target.value === '' ? null : Number(target.value))
    return
  }
  emit('update:modelValue', target.value)
}

function clear() {
  emit('update:modelValue', props.type === 'number' ? null : '')
  emit('clear')
  inputEl.value?.focus()
}

function focus() {
  inputEl.value?.focus()
}

defineExpose({ focus, el: inputEl })
</script>

<template>
  <div
    class="field"
    :class="[
      `field--${props.size}`,
      { 'field--error': !!props.error, 'field--disabled': props.disabled, 'field--focused': focused },
    ]"
  >
    <label v-if="props.label" class="field__label" :for="uid">
      {{ props.label }}
      <span v-if="props.required" class="field__req" aria-hidden="true">*</span>
    </label>

    <div class="field__control">
      <i v-if="props.icon" class="field__icon" :class="props.icon" aria-hidden="true" />

      <input
        :id="uid"
        ref="inputEl"
        class="field__input"
        :type="resolvedType"
        :value="props.modelValue ?? ''"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :readonly="props.readonly"
        :required="props.required"
        :autocomplete="props.autocomplete"
        :maxlength="props.maxlength"
        :min="props.min"
        :max="props.max"
        :step="props.step"
        :aria-invalid="!!props.error || undefined"
        :aria-describedby="describedBy"
        @input="onInput"
        @focus="focused = true; emit('focus', $event)"
        @blur="focused = false; emit('blur', $event)"
        @keydown.enter="emit('enter', $event)"
      />

      <Transition name="fade">
        <button
          v-if="showClear"
          class="field__btn"
          type="button"
          tabindex="-1"
          aria-label="Limpiar campo"
          @click="clear"
        >
          <i class="fa-solid fa-xmark" aria-hidden="true" />
        </button>
      </Transition>

      <button
        v-if="isPassword"
        class="field__btn"
        type="button"
        tabindex="-1"
        :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
        @click="showPassword = !showPassword"
      >
        <i :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'" aria-hidden="true" />
      </button>

      <span v-if="$slots.suffix" class="field__suffix"><slot name="suffix" /></span>
    </div>

    <Transition name="fade-slide" mode="out-in">
      <p v-if="props.error" :id="`${uid}-err`" class="field__msg field__msg--error" role="alert">
        <i class="fa-solid fa-circle-exclamation" aria-hidden="true" />
        {{ props.error }}
      </p>
      <p v-else-if="props.hint" :id="`${uid}-hint`" class="field__msg">{{ props.hint }}</p>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.field {
  @include flex-col($sp-2);
  width: 100%;
  min-width: 0;
}

.field__label {
  @include label-text;
  @include flex(row, flex-start, center, 3px);
  transition: color $transition-base;
}

.field--focused .field__label {
  color: $primary;
}

.field--error .field__label {
  color: $alert-error;
}

.field__req {
  color: $primary;
  font-size: 0.9em;
}

.field__control {
  @include flex(row, flex-start, center, $sp-2);
  background: $surface;
  border: 1px solid $border-color;
  border-radius: $radius-sm;
  padding: 0 $sp-3;
  transition: border-color $transition-base, box-shadow $transition-base, background $transition-base;

  &:hover {
    border-color: $border-strong;
  }
}

.field--focused .field__control {
  @include focus-ring;
}

.field--error .field__control {
  border-color: $alert-error;
  background: rgba($alert-error, 0.03);
}

.field--error.field--focused .field__control {
  @include focus-ring($alert-error);
}

.field--disabled .field__control {
  background: rgba($primary-dark, 0.04);
  cursor: not-allowed;
  opacity: 0.7;
}

.field__icon {
  color: $text-secondary;
  font-size: $fs-sm;
  flex: none;
  transition: color $transition-base;
}

.field--focused .field__icon {
  color: $primary;
}

.field__input {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: $fs-base;
  color: $primary-dark;
  padding: 0;

  &::placeholder {
    color: rgba($primary-dark, 0.35);
  }

  &:disabled {
    cursor: not-allowed;
  }

  // Oculta las flechas nativas de los number inputs
  &[type='number'] {
    -moz-appearance: textfield;
    appearance: textfield;
  }
  &[type='number']::-webkit-outer-spin-button,
  &[type='number']::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
}

.field__btn {
  @include flex-center;
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: $radius-full;
  color: $text-secondary;
  font-size: $fs-xs;
  transition: background $transition-fast, color $transition-fast, transform $transition-fast;

  &:hover {
    background: rgba($primary-dark, 0.07);
    color: $primary;
    transform: scale(1.1);
  }
  &:active { transform: scale(0.92); }
}

.field__suffix {
  @include flex-center;
  flex: none;
  font-size: $fs-sm;
  color: $text-secondary;
}

.field__msg {
  font-size: $fs-xs;
  color: $text-secondary;
  line-height: 1.4;
  @include flex(row, flex-start, center, $sp-1);

  &--error { color: $alert-error; font-weight: 600; }
}

// ── Tamaños ──────────────────────────────────────────────────────
.field--sm .field__control { padding: 0 $sp-2; }
.field--sm .field__input { font-size: $fs-sm; height: 34px; }

.field--md .field__input { height: 42px; }

.field--lg .field__control { padding: 0 $sp-4; }
.field--lg .field__input { height: 52px; font-size: $fs-md; }
</style>
