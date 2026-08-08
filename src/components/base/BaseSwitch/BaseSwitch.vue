<script setup lang="ts">
import { computed, useId } from 'vue'

interface Props {
  modelValue: boolean
  label?: string
  description?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  reverse?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  description: '',
  disabled: false,
  size: 'md',
  reverse: false,
})

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const uid = useId()
const descId = computed(() => (props.description ? `${uid}-desc` : undefined))

function toggle() {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    toggle()
  }
}
</script>

<template>
  <div
    class="switch"
    :class="[`switch--${props.size}`, { 'switch--disabled': props.disabled, 'switch--reverse': props.reverse }]"
  >
    <button
      :id="uid"
      class="switch__track"
      type="button"
      role="switch"
      :aria-checked="props.modelValue"
      :aria-label="props.label || 'Alternar'"
      :aria-describedby="descId"
      :disabled="props.disabled"
      @click="toggle"
      @keydown="onKeydown"
    >
      <span class="switch__thumb">
        <i class="switch__thumb-icon" :class="props.modelValue ? 'fa-solid fa-check' : 'fa-solid fa-xmark'" aria-hidden="true" />
      </span>
    </button>

    <label v-if="props.label || props.description || $slots.default" class="switch__body" :for="uid">
      <span v-if="props.label" class="switch__label">{{ props.label }}</span>
      <span v-if="props.description" :id="descId" class="switch__desc">{{ props.description }}</span>
      <slot />
    </label>
  </div>
</template>

<style scoped lang="scss">
.switch {
  @include flex(row, flex-start, flex-start, $sp-3);

  &--reverse {
    flex-direction: row-reverse;
    justify-content: space-between;
  }

  &--disabled {
    opacity: 0.55;
    pointer-events: none;
  }
}

.switch__track {
  position: relative;
  flex: none;
  display: block;
  width: 46px;
  height: 26px;
  padding: 0;
  border-radius: $radius-full;
  background: rgba($primary-dark, 0.18);
  cursor: pointer;
  transition: background $transition-base, box-shadow $transition-base;

  &:focus-visible {
    @include focus-ring;
  }

  &:active .switch__thumb {
    width: 24px;
  }
}

.switch__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  @include flex-center;
  width: 20px;
  height: 20px;
  border-radius: $radius-full;
  background: $white;
  box-shadow: $shadow-sm;
  transition: transform 0.28s $ease-spring, width $transition-fast, background $transition-base;
}

.switch__thumb-icon {
  font-size: 0.55rem;
  color: $text-secondary;
  transition: color $transition-base, opacity $transition-base;
}

.switch__track[aria-checked='true'] {
  background: $primary;

  .switch__thumb {
    transform: translateX(20px);
  }
  .switch__thumb-icon {
    color: $primary;
  }
}

.switch__body {
  @include flex-col($sp-1);
  cursor: pointer;
  min-width: 0;
}

.switch__label {
  font-size: $fs-sm;
  font-weight: 600;
  color: $primary-dark;
  transition: color $transition-base;
}

.switch__desc {
  font-size: $fs-xs;
  color: $text-secondary;
  line-height: 1.45;
}

// ── Tamaño sm ────────────────────────────────────────────────────
.switch--sm {
  .switch__track { width: 38px; height: 22px; }
  .switch__thumb { width: 16px; height: 16px; top: 3px; left: 3px; }
  .switch__track[aria-checked='true'] .switch__thumb { transform: translateX(16px); }
  .switch__thumb-icon { font-size: 0.45rem; }
}
</style>
