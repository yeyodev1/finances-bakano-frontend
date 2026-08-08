<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useId, watch } from 'vue'

interface Props {
  modelValue?: string | null
  label?: string
  placeholder?: string
  rows?: number
  maxRows?: number
  maxlength?: number
  counter?: boolean
  autogrow?: boolean
  error?: string
  hint?: string
  required?: boolean
  disabled?: boolean
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  label: '',
  placeholder: '',
  rows: 3,
  maxRows: 10,
  counter: false,
  autogrow: true,
  error: '',
  hint: '',
  required: false,
  disabled: false,
  readonly: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
}>()

const uid = useId()
const areaEl = ref<HTMLTextAreaElement | null>(null)
const focused = ref(false)

const length = computed(() => (props.modelValue ?? '').length)
const nearLimit = computed(() => !!props.maxlength && length.value >= props.maxlength * 0.9)
const describedBy = computed(() => {
  if (props.error) return `${uid}-err`
  if (props.hint) return `${uid}-hint`
  return undefined
})

function resize() {
  const el = areaEl.value
  if (!el || !props.autogrow) return
  el.style.height = 'auto'
  const lineHeight = parseFloat(getComputedStyle(el).lineHeight || '20') || 20
  const padding =
    parseFloat(getComputedStyle(el).paddingTop) + parseFloat(getComputedStyle(el).paddingBottom)
  const max = lineHeight * props.maxRows + padding
  const next = Math.min(el.scrollHeight, max)
  el.style.height = `${next}px`
  el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden'
}

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
  nextTick(resize)
}

watch(() => props.modelValue, () => nextTick(resize))
onMounted(() => nextTick(resize))

function focus() {
  areaEl.value?.focus()
}

defineExpose({ focus, el: areaEl })
</script>

<template>
  <div
    class="ta"
    :class="{ 'ta--error': !!props.error, 'ta--disabled': props.disabled, 'ta--focused': focused }"
  >
    <div v-if="props.label || (props.counter && props.maxlength)" class="ta__head">
      <label v-if="props.label" class="ta__label" :for="uid">
        {{ props.label }}
        <span v-if="props.required" class="ta__req" aria-hidden="true">*</span>
      </label>
      <span
        v-if="props.counter && props.maxlength"
        class="ta__counter"
        :class="{ 'ta__counter--warn': nearLimit }"
      >
        {{ length }} / {{ props.maxlength }}
      </span>
    </div>

    <div class="ta__control">
      <textarea
        :id="uid"
        ref="areaEl"
        class="ta__area"
        :value="props.modelValue ?? ''"
        :rows="props.rows"
        :placeholder="props.placeholder"
        :maxlength="props.maxlength"
        :disabled="props.disabled"
        :readonly="props.readonly"
        :required="props.required"
        :aria-invalid="!!props.error || undefined"
        :aria-describedby="describedBy"
        @input="onInput"
        @focus="focused = true; emit('focus', $event)"
        @blur="focused = false; emit('blur', $event)"
      />
    </div>

    <Transition name="fade-slide" mode="out-in">
      <p v-if="props.error" :id="`${uid}-err`" class="ta__msg ta__msg--error" role="alert">
        <i class="fa-solid fa-circle-exclamation" aria-hidden="true" />
        {{ props.error }}
      </p>
      <p v-else-if="props.hint" :id="`${uid}-hint`" class="ta__msg">{{ props.hint }}</p>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.ta {
  @include flex-col($sp-2);
  width: 100%;
  min-width: 0;
}

.ta__head {
  @include flex-between(baseline, $sp-3);
}

.ta__label {
  @include label-text;
  @include flex(row, flex-start, center, 3px);
  transition: color $transition-base;
}

.ta--focused .ta__label { color: $primary; }
.ta--error .ta__label { color: $alert-error; }

.ta__req { color: $primary; }

.ta__counter {
  font-size: $fs-xs;
  color: $text-secondary;
  font-variant-numeric: tabular-nums;
  transition: color $transition-base;

  &--warn { color: $alert-warning; font-weight: 700; }
}

.ta__control {
  display: flex;
  background: $surface;
  border: 1px solid $border-color;
  border-radius: $radius-sm;
  padding: $sp-3;
  transition: border-color $transition-base, box-shadow $transition-base, background $transition-base;

  &:hover { border-color: $border-strong; }
}

.ta--focused .ta__control { @include focus-ring; }
.ta--error .ta__control { border-color: $alert-error; background: rgba($alert-error, 0.03); }
.ta--error.ta--focused .ta__control { @include focus-ring($alert-error); }
.ta--disabled .ta__control { background: rgba($primary-dark, 0.04); opacity: 0.7; }

.ta__area {
  @include scrollbar(6px);
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  resize: none;
  font-size: $fs-base;
  line-height: 1.55;
  color: $primary-dark;
  transition: height $transition-fast;

  &::placeholder { color: rgba($primary-dark, 0.35); }
  &:disabled { cursor: not-allowed; }
}

.ta__msg {
  font-size: $fs-xs;
  color: $text-secondary;
  line-height: 1.4;
  @include flex(row, flex-start, center, $sp-1);

  &--error { color: $alert-error; font-weight: 600; }
}
</style>
