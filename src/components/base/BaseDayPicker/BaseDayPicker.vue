<script setup lang="ts">
import { computed, useId } from 'vue'

interface Props {
  modelValue: number | null
  label?: string
  clearable?: boolean
  hint?: string
  error?: string
  disabled?: boolean
  required?: boolean
  /** Texto del estado "sin día fijo". */
  emptyLabel?: string
  /** Último día seleccionable (por defecto 31). */
  maxDay?: number
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  clearable: true,
  hint: '',
  error: '',
  disabled: false,
  required: false,
  emptyLabel: 'Sin día fijo',
  maxDay: 31,
})

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
  change: [value: number | null]
}>()

const uid = useId()
const days = computed(() => Array.from({ length: Math.min(31, props.maxDay) }, (_, i) => i + 1))
const describedBy = computed(() => {
  if (props.error) return `${uid}-err`
  if (props.hint) return `${uid}-hint`
  return undefined
})

function select(day: number) {
  if (props.disabled) return
  const next = props.modelValue === day ? null : day
  emit('update:modelValue', next)
  emit('change', next)
}

function clear() {
  if (props.disabled) return
  emit('update:modelValue', null)
  emit('change', null)
}

function onKeydown(event: KeyboardEvent, day: number) {
  const map: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 }
  const step = map[event.key]
  if (step === undefined) return
  event.preventDefault()
  const target = Math.min(days.value.length, Math.max(1, day + step))
  const el = document.getElementById(`${uid}-d${target}`)
  el?.focus()
}
</script>

<template>
  <div
    class="daypick"
    :class="{ 'daypick--error': !!props.error, 'daypick--disabled': props.disabled }"
    role="group"
    :aria-labelledby="props.label ? `${uid}-label` : undefined"
    :aria-describedby="describedBy"
  >
    <div v-if="props.label || props.clearable" class="daypick__head">
      <span v-if="props.label" :id="`${uid}-label`" class="daypick__label">
        {{ props.label }}
        <span v-if="props.required" class="daypick__req" aria-hidden="true">*</span>
      </span>

      <Transition name="fade">
        <span v-if="props.modelValue !== null" class="daypick__current">Día {{ props.modelValue }}</span>
      </Transition>
    </div>

    <div class="daypick__grid">
      <button
        v-for="day in days"
        :id="`${uid}-d${day}`"
        :key="day"
        class="daypick__day"
        :class="{ 'daypick__day--on': props.modelValue === day }"
        type="button"
        :disabled="props.disabled"
        :aria-pressed="props.modelValue === day"
        @click="select(day)"
        @keydown="onKeydown($event, day)"
      >
        {{ day }}
      </button>
    </div>

    <button
      v-if="props.clearable"
      class="daypick__none"
      :class="{ 'daypick__none--on': props.modelValue === null }"
      type="button"
      :disabled="props.disabled"
      :aria-pressed="props.modelValue === null"
      @click="clear"
    >
      <i class="fa-solid fa-ban" aria-hidden="true" />
      {{ props.emptyLabel }}
    </button>

    <Transition name="fade-slide" mode="out-in">
      <p v-if="props.error" :id="`${uid}-err`" class="daypick__msg daypick__msg--error" role="alert">
        <i class="fa-solid fa-circle-exclamation" aria-hidden="true" />
        {{ props.error }}
      </p>
      <p v-else-if="props.hint" :id="`${uid}-hint`" class="daypick__msg">{{ props.hint }}</p>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.daypick {
  @include flex-col($sp-2);
  width: 100%;
  min-width: 0;

  &--disabled { opacity: 0.6; pointer-events: none; }
}

.daypick__head {
  @include flex-between(center, $sp-2);
}

.daypick__label {
  @include label-text;
  @include flex(row, flex-start, center, 3px);
}

.daypick__req { color: $primary; }

.daypick__current {
  font-size: $fs-xs;
  font-weight: 700;
  color: $primary;
  background: rgba($primary, 0.1);
  border-radius: $radius-full;
  padding: 2px $sp-2;
}

.daypick__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  padding: $sp-2;
  background: $surface;
  border: 1px solid $border-color;
  border-radius: $radius-sm;
  transition: border-color $transition-base;
}

.daypick--error .daypick__grid { border-color: $alert-error; }

.daypick__day {
  @include flex-center;
  aspect-ratio: 1 / 1;
  min-height: 32px;
  border-radius: $radius-xs;
  font-size: $fs-xs;
  font-weight: 600;
  color: $primary-dark;
  transition: background $transition-fast, color $transition-fast, transform $transition-fast,
    box-shadow $transition-fast;

  &:hover:not(:disabled) { background: rgba($primary, 0.12); color: $primary; transform: scale(1.12); }
  &:active:not(:disabled) { transform: scale(0.9); }
  &:focus-visible { @include focus-ring; }

  &--on {
    background: $primary;
    color: $white;
    box-shadow: $shadow-primary;
    transform: scale(1.05);

    &:hover { background: darken($primary, 5); color: $white; }
  }

  @include md {
    min-height: 34px;
    font-size: $fs-sm;
  }
}

.daypick__none {
  @include flex-center($sp-2);
  align-self: flex-start;
  padding: $sp-2 $sp-3;
  border-radius: $radius-full;
  border: 1px dashed $border-strong;
  font-size: $fs-xs;
  font-weight: 600;
  color: $text-secondary;
  transition: background $transition-fast, color $transition-fast, border-color $transition-fast,
    transform $transition-fast;

  &:hover { background: rgba($primary-dark, 0.05); transform: translateY(-1px); }

  &--on {
    background: rgba($secondary, 0.12);
    border-style: solid;
    border-color: rgba($secondary, 0.4);
    color: $secondary;
  }
}

.daypick__msg {
  font-size: $fs-xs;
  color: $text-secondary;
  @include flex(row, flex-start, center, $sp-1);

  &--error { color: $alert-error; font-weight: 600; }
}
</style>
